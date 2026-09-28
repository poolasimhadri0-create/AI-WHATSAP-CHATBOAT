// Token keys
const ACCESS_KEY  = 'ai_chat_access';
const REFRESH_KEY = 'ai_chat_refresh';

export const tokenStorage = {
  setTokens(access, refresh) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  getAccess()  { return localStorage.getItem(ACCESS_KEY); },
  getRefresh() { return localStorage.getItem(REFRESH_KEY); },
  clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  hasTokens() {
    return !!localStorage.getItem(ACCESS_KEY);
  },
};
