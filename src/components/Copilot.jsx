import { useState } from 'react';
import brand from '../config/brand';

const suggestedPrompts = [
  { id: 'p1', label: 'What are our highest-priority gaps?' },
  { id: 'p2', label: 'Show requests due this week.' },
  { id: 'p3', label: 'Summarise high-risk vendors.' },
  { id: 'p4', label: 'Explain our score change.' },
  { id: 'p5', label: 'Draft an action plan.' },
  { id: 'p6', label: 'Show policies due for review.' },
];

// Static response map for demo phase (Phase 5 will use real AI)
const demoResponses = {
  default: {
    answer: 'I can help you navigate DPDP readiness, summarise gaps, and suggest next steps based on your organisation\'s data.',
    why: 'Understanding your compliance posture is the first step to reducing privacy risk.',
    action: 'Start by reviewing your DPDP Readiness Score and the top 3 priority actions on your dashboard.',
    source: 'DPDP Act 2023 — General Obligations for Data Fiduciaries',
    disclaimer: brand.disclaimer,
  },
  gaps: {
    answer: 'Your top 3 priority gaps are: (1) CleverTap DPA is missing — high risk; (2) Erasure request REQ-007 is overdue; (3) Analytics consent notice does not reflect current data collected.',
    why: 'These gaps directly reduce your DPDP Readiness Score and increase your exposure to enforcement risk.',
    action: 'Address the CleverTap DPA first, then process the overdue request, then update the consent notice.',
    source: 'DPDP Act 2023 — Sections 8, 10, 11 — Data Fiduciary Obligations',
    disclaimer: brand.disclaimer,
  },
  vendors: {
    answer: 'Your 3 highest-risk vendors are: CleverTap (DPA missing, contract expired), Razorpay (agreement pending signature), and Amazon SES (review overdue by 120 days).',
    why: 'Processing personal data through vendors without Data Processing Agreements is a significant DPDP obligation gap.',
    action: 'Prioritise signing or obtaining DPAs from CleverTap and Razorpay within the next 14 days.',
    source: 'DPDP Act 2023 — Section 8(2) — Processor obligations',
    disclaimer: brand.disclaimer,
  },
};

function getResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('gap') || lower.includes('priorit') || lower.includes('missing')) return demoResponses.gaps;
  if (lower.includes('vendor')) return demoResponses.vendors;
  return demoResponses.default;
}

export default function Copilot({ open, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function sendMessage(text) {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text, id: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const response = getResponse(text);
      setMessages((m) => [
        ...m,
        { role: 'assistant', response, id: Date.now() + 1 },
      ]);
      setLoading(false);
    }, 900);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Toggle button — positioned so it never covers the main nav */}
      <button
        id="copilot-toggle-btn"
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-blue-500/30 transition hover:scale-105 hover:shadow-blue-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        aria-label={open ? 'Close AI Copilot' : 'Open AI Copilot'}
        aria-expanded={open}
      >
        <span className="text-base leading-none">✦</span>
        <span>{open ? 'Close Copilot' : 'AI Copilot'}</span>
      </button>

      {/* Copilot panel — positioned above the button, not over content */}
      {open && (
        <div
          id="copilot-panel"
          className="fixed bottom-20 right-6 z-40 flex h-[min(78vh,560px)] w-[min(92vw,400px)] flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-[#0a1628]/98 shadow-2xl shadow-black/50 backdrop-blur-xl"
          role="complementary"
          aria-label="AI Copilot panel"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-emerald-400">
                <span className="text-xs text-white">✦</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Copilot</p>
                <p className="text-[10px] text-slate-500">General guidance only — not legal advice</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Close AI Copilot"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 11.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <>
                <p className="text-xs text-slate-500">Suggested questions:</p>
                <div className="space-y-1.5">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => sendMessage(p.label)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-blue-500/40 hover:bg-blue-500/8 hover:text-blue-300"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-600/80 px-3 py-2 text-white">
                      {msg.text}
                    </div>
                  </div>
                );
              }
              const r = msg.response;
              return (
                <div key={msg.id} className="space-y-2">
                  <div className="rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900/70 p-3 text-slate-200">
                    <p>{r.answer}</p>
                  </div>
                  {r.why && (
                    <div className="rounded-xl border border-blue-500/15 bg-blue-500/6 px-3 py-2 text-xs text-blue-300">
                      <span className="font-semibold">Why it matters: </span>{r.why}
                    </div>
                  )}
                  {r.action && (
                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/6 px-3 py-2 text-xs text-emerald-300">
                      <span className="font-semibold">Recommended action: </span>{r.action}
                    </div>
                  )}
                  {r.source && (
                    <p className="px-1 text-[10px] text-slate-600">Source: {r.source}</p>
                  )}
                  <p className="px-1 text-[9px] leading-relaxed text-slate-700">{r.disclaimer}</p>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-800/60 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 focus-within:border-blue-500/40">
              <input
                id="copilot-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your privacy posture..."
                className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                aria-label="Ask AI Copilot"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="rounded-lg bg-blue-600 p-1.5 text-white transition hover:bg-blue-500 disabled:opacity-40"
                aria-label="Send message"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M15.854.146a.5.5 0 01.11.54l-5.819 14.547a.75.75 0 01-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 01.124-1.33L15.314.037a.5.5 0 01.54.11z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
