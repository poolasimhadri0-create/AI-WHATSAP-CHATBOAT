import {
  createContext, useContext, useState, useCallback, useRef,
} from 'react';
import { chatService } from '../services/chatService';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [conversations, setConversations]   = useState([]);  // sidebar list
  const [activeConvId, setActiveConvId]     = useState(null);
  const [messages, setMessages]             = useState([]);  // current conversation messages
  const [convTitle, setConvTitle]           = useState('New Chat');
  const [isStreaming, setIsStreaming]        = useState(false);
  const [loadingConvs, setLoadingConvs]     = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const abortControllerRef = useRef(null);

  // ── Fetch conversation list ────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await chatService.listConversations();
      setConversations(data);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  // ── Load a conversation's history ─────────────────────────
  const loadConversation = useCallback(async (convId) => {
    setLoadingHistory(true);
    setActiveConvId(convId);
    setMessages([]);
    try {
      const data = await chatService.getHistory(convId);
      setConvTitle(data.title || 'Conversation');
      setMessages(
        (data.messages || []).map((m) => ({
          id:        m.id,
          role:      m.role,
          content:   m.content,
          createdAt: m.created_at,
          tokens:    m.tokens_used,
        }))
      );
    } catch {
      toast.error('Failed to load conversation history');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ── Start a new chat (clear state) ────────────────────────
  const newChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setConvTitle('New Chat');
  }, []);

  // ── Delete a conversation ──────────────────────────────────
  const deleteConversation = useCallback(async (convId) => {
    try {
      await chatService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) newChat();
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    }
  }, [activeConvId, newChat]);

  // ── Send message + stream response ────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = {
      id:        `local-${Date.now()}`,
      role:      'user',
      content:   text.trim(),
      createdAt: new Date().toISOString(),
    };

    // Placeholder for AI response
    const aiMsgId = `ai-${Date.now()}`;
    const aiPlaceholder = {
      id:        aiMsgId,
      role:      'assistant',
      content:   '',
      createdAt: new Date().toISOString(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    setIsStreaming(true);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    await chatService.streamMessage({
      message:        text.trim(),
      conversationId: activeConvId,
      signal:         abortCtrl.signal,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: m.content + token }
              : m
          )
        );
      },
      onDone: (info) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, streaming: false } : m
          )
        );
        // Update conversation list if new conversation was created
        if (info?.conversation_id) {
          const newId = info.conversation_id;
          if (!activeConvId) {
            setActiveConvId(newId);
          }
          // Refresh sidebar
          chatService.listConversations().then(setConversations).catch(() => {});
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: m.content || '⚠️ Failed to get response.', streaming: false, error: true }
              : m
          )
        );
        if (err.message !== 'AbortError') {
          toast.error(err.message || 'Stream failed');
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
    });
  }, [activeConvId, isStreaming]);

  // ── Abort streaming ────────────────────────────────────────
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.streaming ? { ...m, streaming: false } : m
      )
    );
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConvId,
        messages,
        convTitle,
        isStreaming,
        loadingConvs,
        loadingHistory,
        fetchConversations,
        loadConversation,
        newChat,
        deleteConversation,
        sendMessage,
        stopGeneration,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
