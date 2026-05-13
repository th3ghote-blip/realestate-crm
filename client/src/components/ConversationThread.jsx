import { formatRelative } from '../lib/leadConstants.js';

const channelLabels = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  whatsapp_link: 'WhatsApp',
};

export default function ConversationThread({ messages }) {
  if (!messages?.length) {
    return <div className="text-sm text-slate-500 py-4">Sin mensajes todavía.</div>;
  }

  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const inbound = m.direction === 'inbound';
        return (
          <li key={m.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              inbound ? 'bg-slate-100 text-slate-900' : 'bg-brand-600 text-white'
            }`}>
              {m.subject && (
                <div className={`text-xs font-semibold mb-0.5 ${inbound ? 'text-slate-700' : 'text-brand-50'}`}>
                  {m.subject}
                </div>
              )}
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`text-[10px] mt-1 opacity-75 ${inbound ? 'text-slate-600' : 'text-brand-50'}`}>
                {channelLabels[m.channel] || m.channel} · {formatRelative(m.sentAt)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
