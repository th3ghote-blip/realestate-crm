// When a lead arrives on a listing that the agent has flagged as
// financingEligible: false (typically rural fincas, certain commercial
// properties), we want to qualify the buyer's financing intent *before*
// the agent spends time on them. This module:
//
//   - sends the lead a Spanish qualification email
//   - logs the outbound message in the conversation thread
//   - creates a qualification_needed Notification for the agent so it
//     surfaces in the bell + inbox even if the email fails to send

import { prisma } from '../db.js';
import { sendEmail } from './emailSender.js';

export async function maybeSendQualificationEmail({ lead, listing, agent }) {
  const firstName = lead.name?.split(/\s+/)[0] || '';
  const subject = `Sobre tu consulta: ${listing.title}`;

  const text = [
    `Hola ${firstName},`,
    '',
    `Gracias por tu interés en "${listing.title}".`,
    '',
    'Este tipo de inmueble normalmente requiere compra al contado o financiación especializada (los bancos suelen no conceder hipotecas estándar). Para poder ayudarte mejor, ¿podrías indicarnos brevemente cómo tienes previsto financiar la operación?',
    '',
    '  · Al contado',
    '  · Hipoteca convencional',
    '  · Financiación alternativa / mixta',
    '',
    'Con tu respuesta podremos enseñarte opciones que encajen con tu situación.',
    '',
    `Un saludo,`,
    agent.name,
  ].join('\n');

  // Always create the Notification so the agent sees the flag even if email
  // fails. Webhook returns 200 regardless.
  await prisma.notification.create({
    data: {
      agentId: agent.id,
      leadId: lead.id,
      listingId: listing.id,
      type: 'qualification_needed',
      message: `${lead.name} preguntó por "${listing.title}" (financiación restringida). Se ha enviado pregunta de cualificación.`,
    },
  });

  if (!lead.email) {
    // No email to write to — agent will see the notification and contact by phone/WhatsApp.
    return { ok: false, error: 'no_lead_email' };
  }

  const result = await sendEmail({
    to: lead.email,
    replyTo: agent.inboundEmailAddress,
    fromName: agent.name,
    subject,
    text,
  });

  // Log the outbound message either way so the agent sees what was sent.
  await prisma.message.create({
    data: {
      leadId: lead.id,
      agentId: agent.id,
      direction: 'outbound',
      channel: 'email',
      subject,
      body: text,
    },
  });

  return result;
}
