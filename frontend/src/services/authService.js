import api from './api';
import { tokenStorage } from '../utils/tokenStorage';

export const authService = {
  /** Register a new user. Returns UserResponse. */
  async register({ name, email, password }) {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },

  /** Login and store tokens. Returns TokenResponse. */
  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  /** Refresh the access token manually. */
  async refresh() {
    const refresh = tokenStorage.getRefresh();
    if (!refresh) throw new Error('No refresh token');
    const { data } = await api.post('/auth/refresh', { refresh_token: refresh });
    tokenStorage.setTokens(data.access_token, refresh);
    return data.access_token;
  },

  /** Get the currently authenticated user's profile. */
  async getMe() {
    const { data } = await api.get('/users/me');
    return data;
  },

  /** Logout: clear local tokens (server is stateless JWT). */
  logout() {
    tokenStorage.clearTokens();
  },
};
