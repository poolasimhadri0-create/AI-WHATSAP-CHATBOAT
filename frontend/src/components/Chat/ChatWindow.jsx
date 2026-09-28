import { useRef, useEffect, memo } from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { BotIcon, SparklesIcon } from 'lucide-react';

/* ── Empty state ──────────────────────────────────────────── */
const SUGGESTIONS = [
  '✨ Explain quantum computing simply',
  '💡 Write a Python web scraper',
  '🎨 Help me brainstorm startup ideas',
  '📝 Summarize the latest AI research',
];

function EmptyState({ onSuggest }) {
  return (
    <div className="empty-state" aria-label="Start a new conversation">
      <div className="empty-logo" aria-hidden="true">
        <BotIcon size={36} color="#fff" />
      </div>

      <div>
        <h1 className="empty-title">How can I help you?</h1>
        <p className="empty-subtitle">
          Ask me anything — I can write code, explain concepts, analyze data,
          draft documents, and much more.
        </p>
      </div>

      <div className="empty-suggestions" role="list" aria-label="Suggested prompts">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="suggestion-chip"
            role="listitem"
            onClick={() => onSuggest(s.slice(2).trim())}
            aria-label={`Try: ${s}`}
          >
            {s}
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
