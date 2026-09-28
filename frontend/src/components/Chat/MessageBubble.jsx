import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyIcon, CheckIcon, BotIcon, UserIcon } from 'lucide-react';
import { formatTime } from '../../utils/formatDate';

/* ── Copy-code button ─────────────────────────────────────── */
function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      className={`copy-code-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ── Code block renderer for react-markdown ───────────────── */
function CodeBlock({ children, className }) {
  const language = (className?.replace('language-', '') || 'text').toLowerCase();
  const code = String(children).replace(/\n$/, '');

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language}</span>
        <CopyCodeButton code={code} />
      </div>
      <div className="code-block-content">
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/* ── Typing indicator ─────────────────────────────────────── */
export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="message-row" aria-label="AI is typing" aria-live="polite">
      <div className="msg-avatar ai-avatar">
        <BotIcon size={15} />
      </div>
      <div className="msg-content">
        <div className="msg-bubble ai-bubble">
          <div className="typing-indicator" aria-hidden="true">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── Markdown components map ──────────────────────────────── */
const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    if (inline) {
      return <code className={className} {...props}>{children}</code>;
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
};

/* ── Message Bubble ───────────────────────────────────────── */
export const MessageBubble = memo(function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`message-row ${isUser ? 'user' : ''}`}
      role="article"
      aria-label={`${isUser ? 'You' : 'AI'}: message`}
    >
      {/* Avatar */}
      <div className={`msg-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`} aria-hidden="true">
        {isUser ? <UserIcon size={14} /> : <BotIcon size={15} />}
      </div>

      {/* Content */}
      <div className="msg-content">
        <div className={`msg-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          ) : (
            <>
              <ReactMarkdown components={markdownComponents}>
                {message.content || ''}
              </ReactMarkdown>
              {message.streaming && <span className="streaming-cursor" aria-hidden="true" />}
            </>
          )}
        </div>

        {/* Meta info */}
        <div className="msg-meta">
          {formatTime(message.createdAt)}
          {message.tokens > 0 && (
            <span className="token-badge" style={{ marginLeft: 6 }}>
              {message.tokens} tkn
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
