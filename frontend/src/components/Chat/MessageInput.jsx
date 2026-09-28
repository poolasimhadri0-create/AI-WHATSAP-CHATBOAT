import { useRef, useState, useCallback, useEffect, memo } from 'react';
import { SendIcon, SquareIcon } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

/**
 * MessageInput — multi-line textarea with:
 * - Enter to send, Shift+Enter for new line
 * - Stop generation button while streaming
 * - Auto-resize up to max height
 */
export const MessageInput = memo(function MessageInput({ initialValue = '', onClear }) {
  const { sendMessage, stopGeneration, isStreaming } = useChat();
  const [text, setText] = useState(initialValue);
  const textareaRef = useRef(null);

  // Auto-fill from suggestion chips
  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
      textareaRef.current?.focus();
      if (onClear) onClear();
    }
  }, [initialValue, onClear]);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
    resize();
  }, [resize]);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isStreaming) return;
    sendMessage(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSend = text.trim().length > 0 && !isStreaming;

  return (
    <div className="input-area" role="form" aria-label="Message input">
      <div className="input-wrapper">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Chat..."
            rows={1}
            aria-label="Type your message"
            aria-multiline="true"
            disabled={false}
            id="message-input"
          />

          <div className="input-actions">
            {isStreaming ? (
              <button
                className="stop-btn"
                onClick={stopGeneration}
                aria-label="Stop generation"
                title="Stop generating"
              >
                <SquareIcon size={16} />
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={!canSend}
                aria-label="Send message"
                title="Send (Enter)"
                id="send-btn"
              >
                <SendIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <p className="input-hint" aria-hidden="true">
          Press <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Enter</kbd> to send,{' '}
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
});
