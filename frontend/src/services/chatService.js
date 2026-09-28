import api from './api';
import { tokenStorage } from '../utils/tokenStorage';
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const BASE = `${API_URL}/api/v1`;

export const chatService = {
  /** List all conversations for current user */
  async listConversations() {
    const { data } = await api.get('/chat/conversations');
    return data; // ConversationResponse[]
  },

  /** Get full conversation history (messages) */
  async getHistory(conversationId) {
    const { data } = await api.get(`/chat/history/${conversationId}`);
    return data; // ConversationDetailResponse
  },

  /** Delete a conversation */
  async deleteConversation(conversationId) {
    const { data } = await api.delete(`/chat/conversations/${conversationId}`);
    return data;
  },

  /**
   * Stream a chat message using fetch + ReadableStream.
   * The backend returns SSE (text/event-stream).
   *
   * @param {object}   opts
   * @param {string}   opts.message         - User message text
   * @param {number|null} opts.conversationId - null → create new convo
   * @param {function} opts.onToken         - called with each text token
   * @param {function} opts.onDone          - called with final {conversation_id, message_id}
   * @param {function} opts.onError         - called on error
   * @param {AbortSignal} opts.signal       - to abort mid-stream
   */
  async streamMessage({ message, conversationId, onToken, onDone, onError, signal }) {
    const token = tokenStorage.getAccess();

    let response;
    try {
      response = await fetch(`${BASE}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId || null,
        }),
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError?.(err);
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      onError?.(new Error(errData?.detail || `HTTP ${response.status}`));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const rawData = line.slice(6).trim();
          if (!rawData || rawData === '[DONE]') continue;

          try {
            const parsed = JSON.parse(rawData);
            const eventType = parsed.event || parsed.type;

            if (eventType === 'start') {
              // Initial metadata event, stream is beginning
              continue;
            } else if (eventType === 'error' || parsed.error) {
              onError?.(new Error(parsed.message || parsed.error || 'Stream error'));
            } else if (eventType === 'done') {
              onDone?.(parsed);
            } else if (eventType === 'chunk' || parsed.token !== undefined) {
              onToken?.(parsed.token ?? parsed.content ?? '');
            } else if (typeof parsed === 'string') {
              onToken?.(parsed);
            }
          } catch {
            // Non-JSON SSE data — treat as raw token text
            onToken?.(rawData);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError?.(err);
    } finally {
      reader.releaseLock();
    }
  },
};
