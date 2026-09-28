import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendBaseUrl } from '../../services/api';

export function ApiUrlModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const location = useLocation();

  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const envUrl = import.meta.env.VITE_API_URL || '';
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('VITE_API_URL') || '' : '';
  const isChatPage = location.pathname === '/chat' || location.pathname === '/';

  useEffect(() => {
    // If running in production and no API URL is configured anywhere, open configuration automatically
    if (!isLocal && !envUrl && !storedUrl) {
      setIsOpen(true);
    }
  }, [isLocal, envUrl, storedUrl]);

  // Listen for custom open event (e.g. from topbar button on chat page)
  useEffect(() => {
    const handleOpen = () => {
      setUrl(storedUrl || envUrl || '');
      setIsOpen(true);
    };
    window.addEventListener('open-api-modal', handleOpen);
    return () => window.removeEventListener('open-api-modal', handleOpen);
  }, [storedUrl, envUrl]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    const clean = url.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    localStorage.setItem('VITE_API_URL', clean);
    setIsOpen(false);
    window.location.reload();
  };

  const handleClear = () => {
    localStorage.removeItem('VITE_API_URL');
    setIsOpen(false);
    window.location.reload();
  };

  const currentConfig = envUrl || storedUrl || '(relative to current domain /api/v1)';

  return (
    <>
      {/* Floating button at top right for non-chat pages (on chat page it sits inside the topbar) */}
      {!isChatPage && (
        <button
          onClick={() => {
            setUrl(storedUrl || envUrl || '');
            setIsOpen(true);
          }}
          className="api-server-floating-btn"
          title="Configure Backend API Server URL"
          aria-label="Configure Backend API Server URL"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: (envUrl || storedUrl) ? '#10b981' : '#f59e0b'
            }}
          />
          API Server
        </button>
      )}

      {/* Modal dialog */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            color: '#f3f4f6',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#fff' }}>
              ⚙️ Backend API Configuration
            </h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              To connect this frontend to your deployed AI chatbot backend, enter your backend URL below.
            </p>

            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              <strong>Currently using:</strong>{' '}
              <code style={{ color: '#60a5fa', wordBreak: 'break-all' }}>{currentConfig}</code>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#d1d5db' }}>
                  Backend URL (e.g. Render URL)
                </label>
                <input
                  type="url"
                  placeholder="https://your-backend.onrender.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                {storedUrl && (
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#374151',
                    color: '#e5e7eb',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
