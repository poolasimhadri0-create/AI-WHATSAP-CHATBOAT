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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuggest = useCallback((text) => {
    setSuggestion(text);
  }, []);

  const handleSuggestionClear = useCallback(() => {
    setSuggestion('');
  }, []);

  const hasConfiguredApi = Boolean(
    import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && localStorage.getItem('VITE_API_URL'))
  );

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'var(--brand-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}
              aria-hidden="true"
            >
              <BotIcon size={16} color="#fff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="topbar-title">{convTitle}</span>
              <span className="topbar-subtitle">
                Groq High-Speed LPU • 800+ tok/s
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="topbar-api-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('open-api-modal'))}
              title="Configure Backend API Server URL"
              aria-label="Backend API Server Configuration"
              id="api-server-btn"
            >
              <span
                className="topbar-api-dot"
                style={{ background: hasConfiguredApi ? '#10b981' : '#f59e0b' }}
              />
              <span className="topbar-api-text">API Server</span>
            </button>

            <div className="status-pill" title="Ultra low-latency streaming enabled">
              <span className="status-dot"></span>
              <span className="status-text">Ultra-Fast • 0.5s</span>
            </div>

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
          initialValue={suggestion}
          onClear={handleSuggestionClear}
        />
      </div>
    </div>
  );
}
