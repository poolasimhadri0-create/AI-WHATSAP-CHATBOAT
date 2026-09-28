import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MessageSquareIcon, Trash2Icon, BotIcon, LogOutIcon } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeDate } from '../../utils/formatDate';

/** Skeleton placeholder for conversation list loading */
function ConvSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px' }}>
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="skeleton skeleton-text" style={{ width: `${60 + i * 8}%` }} />
            <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Single conversation item in sidebar */
const ConvItem = memo(function ConvItem({ conv, isActive, onSelect, onDelete }) {
  return (
    <div
      className={`conv-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(conv.id)}
      role="button"
      tabIndex={0}
      aria-label={`Conversation: ${conv.title}`}
      aria-current={isActive ? 'true' : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conv.id)}
    >
      <div className="conv-item-icon">
        <MessageSquareIcon size={14} />
      </div>
      <div className="conv-item-content">
        <div className="conv-item-title">{conv.title || 'New Conversation'}</div>
        <div className="conv-item-date">{formatRelativeDate(conv.updated_at)}</div>
      </div>
      <div className="conv-item-actions">
        <button
          className="conv-action-btn"
          aria-label="Delete conversation"
          onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
        >
          <Trash2Icon size={13} />
        </button>
      </div>
    </div>
  );
});

/** Full conversation list */
export const ConversationList = memo(function ConversationList({ onItemClick }) {
  const { conversations, activeConvId, loadConversation, deleteConversation, loadingConvs } = useChat();

  const handleSelect = (id) => {
    loadConversation(id);
    if (onItemClick && window.innerWidth <= 768) {
      onItemClick();
    }
  };

  if (loadingConvs) return <ConvSkeleton />;

  if (!conversations.length) {
    return (
      <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No conversations yet.
        <br />Start a new chat!
      </div>
    );
  }

  return (
    <div role="list" aria-label="Conversation history">
      <div className="conv-section-label">Recent</div>
      {conversations.map((conv) => (
        <ConvItem
          key={conv.id}
          conv={conv}
          isActive={conv.id === activeConvId}
          onSelect={handleSelect}
          onDelete={deleteConversation}
        />
      ))}
    </div>
  );
});

/** New Chat button */
export const NewChatButton = memo(function NewChatButton({ onClick }) {
  const { newChat } = useChat();

  const handleClick = () => {
    newChat();
    if (onClick && window.innerWidth <= 768) {
      onClick();
    }
  };

  return (
    <button
      className="btn-new-chat"
      onClick={handleClick}
      aria-label="Start new chat"
      id="new-chat-btn"
    >
      <PlusIcon size={16} />
      New Chat
    </button>
  );
});

/** The full sidebar */
export function Sidebar({ collapsed, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${!collapsed ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : 'open'}`}
        aria-label="Sidebar"
        role="navigation"
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-hidden="true">
            <BotIcon size={18} color="#fff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="sidebar-title">AI Chat</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '6px',
                textTransform: 'uppercase',
              }}
            >
              TURBO
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="sidebar-body">
          <NewChatButton onClick={onClose} />
          <ConversationList onItemClick={onClose} />
        </div>

        {/* Footer – User info */}
        <div className="sidebar-footer">
          <div className="user-info" role="group" aria-label="User account">
            <div className="user-avatar-bubble" aria-hidden="true">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
            <button
              className="icon-btn"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOutIcon size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
