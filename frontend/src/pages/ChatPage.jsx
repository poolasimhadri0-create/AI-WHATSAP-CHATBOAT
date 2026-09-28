import { useState, useEffect, useCallback } from 'react';
import { MenuIcon, XIcon, SunIcon, MoonIcon, BotIcon } from 'lucide-react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { MessageInput } from '../components/Chat/MessageInput';
import { useChat } from '../context/ChatContext';

/* ── Theme hook ───────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ai-chat-theme') || 'dark'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai-chat-theme', theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}

export default function ChatPage() {
  const { fetchConversations, convTitle } = useChat();
  const { theme, toggle: toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [suggestion, setSuggestion]   = useState('');
  const [clearFlag, setClearFlag]      = useState(0); // increment to signal clear

  // Mobile: default closed
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.matches) setSidebarOpen(false);
    const handler = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSuggest = useCallback((text) => {
    setSuggestion(text);
  }, []);

  const handleSuggestionClear = useCallback(() => {
    setClearFlag((n) => n + 1);
  }, []);

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={!sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main Chat ── */}
      <div className="chat-main">
        {/* Top Bar */}
        <header className="topbar" role="banner">
          <button
            className="icon-btn"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            id="sidebar-toggle"
          >
            {sidebarOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--user-bubble)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <BotIcon size={15} color="#fff" />
            </div>
            <span className="topbar-title">{convTitle}</span>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              id="theme-toggle"
            >
              {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
          </div>
        </header>

        {/* Message Window */}
        <ChatWindow onSuggest={handleSuggest} />

        {/* Input */}
        <MessageInput
          key={clearFlag}
          initialValue={suggestion}
          onClear={handleSuggestionClear}
        />
      </div>
    </div>
  );
}
