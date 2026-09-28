import { useRef, useEffect, memo } from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { BotIcon, SparklesIcon } from 'lucide-react';

/* ── Rich Suggestions ─────────────────────────────────────── */
const SUGGESTION_CARDS = [
  {
    icon: '⚡',
    badge: 'Code',
    title: 'Python Async API',
    desc: 'Write a high-performance FastAPI service with SSE streaming',
    prompt: 'Write a complete, async Python FastAPI service with health check, CORS middleware, and streaming response.',
  },
  {
    icon: '🧠',
    badge: 'Concept',
    title: 'Explain Quantum Physics',
    desc: 'Break down superposition and qubits with intuitive analogies',
    prompt: 'Explain quantum computing and superposition in simple terms with intuitive everyday analogies.',
  },
  {
    icon: '🚀',
    badge: 'Architecture',
    title: 'Design a Scalable App',
    desc: 'High-throughput system architecture with Redis & MySQL caching',
    prompt: 'Design a scalable real-time architecture for an AI chatbot handling 50k concurrent users.',
  },
  {
    icon: '✨',
    badge: 'Productivity',
    title: 'Draft Product Launch',
    desc: 'Engaging, viral social media copy for a fast AI chatbot',
    prompt: 'Draft an engaging Twitter and LinkedIn product launch announcement for a sub-second ultra-fast AI assistant.',
  },
];

function EmptyState({ onSuggest }) {
  return (
    <div className="empty-state" aria-label="Start a new conversation">
      <div className="empty-logo" aria-hidden="true">
        <SparklesIcon size={38} color="#fff" />
      </div>

      <div style={{ maxWidth: 560 }}>
        <h1 className="empty-title">Where knowledge meets speed</h1>
        <p className="empty-subtitle">
          Ask questions, debug code, brainstorm ideas, or analyze complex data.
          Powered by low-latency LPU inference for instantaneous answers.
        </p>
      </div>

      <div className="empty-suggestions" role="list" aria-label="Suggested prompts">
        {SUGGESTION_CARDS.map((card, idx) => (
          <button
            key={idx}
            className="suggestion-chip"
            role="listitem"
            onClick={() => onSuggest(card.prompt)}
            aria-label={`Try: ${card.title}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '18px' }} aria-hidden="true">{card.icon}</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-light)',
                  border: '1px solid rgba(99, 102, 241, 0.25)'
                }}
              >
                {card.badge}
              </span>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', marginBottom: 3 }}>
              {card.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {card.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── History loader skeleton ──────────────────────────────── */
function HistorySkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[1, 0, 1, 0].map((isUser, i) => (
        <div key={i} className={`message-row ${isUser ? 'user' : ''}`}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: isUser ? 'unset' : 1, width: isUser ? '55%' : '70%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 14, width: '80%' }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
            {i % 2 === 1 && <div className="skeleton" style={{ height: 14, width: '40%' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Chat Window ──────────────────────────────────────────── */
export const ChatWindow = memo(function ChatWindow({ onSuggest }) {
  const { messages, isStreaming, loadingHistory } = useChat();
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div
      className="messages-window"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      <div className="messages-inner">
        {loadingHistory ? (
          <HistorySkeleton />
        ) : messages.length === 0 ? (
          <EmptyState onSuggest={onSuggest} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Show typing indicator when streaming just started (content empty) */}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
});
