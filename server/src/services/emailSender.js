// Outbound email sender. Uses SendGrid Web API v3 when SENDGRID_API_KEY is set,
// otherwise the call returns ok:false with reason 'no_provider' and the caller
// stores the message as logged_only so the agent still sees it in the thread.
//
// We deliberately don't take a hard dep on @sendgrid/mail to keep the bundle
// small and avoid the npm hop — SendGrid's API is a one-liner over fetch.

const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';

export async function sendEmail({ to, replyTo, fromName, subject, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return { ok: false, error: 'no_provider' };
  }

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: fromName || 'CRM Inmobiliario' },
    reply_to: replyTo ? { email: replyTo } : undefined,
    subject: subject || '(sin asunto)',
    content: [{ type: 'text/plain', value: text }],
  };

  try {
    const res = await fetch(SENDGRID_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.status >= 200 && res.status < 300) return { ok: true };
    const detail = await res.text();
    return { ok: false, error: `sendgrid_${res.status}`, detail: detail.slice(0, 500) };
  } catch (err) {
    return { ok: false, error: 'network_error', detail: err.message };
  }
}
