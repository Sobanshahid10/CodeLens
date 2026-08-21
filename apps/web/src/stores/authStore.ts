import { create } from 'zustand';
import { clearToken, getToken, setToken } from '../lib/auth';

export interface UserProfile {
  id: string;
  github_id: number;
  github_login: string;
  email: string | null;
  avatar_url: string | null;
  plan: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  initAuthFromUrl: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  isAuthenticated: !!getToken(),
  isLoading: false,

  setAuth: (token: string, user: UserProfile) => {
    setToken(token);
    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    clearToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initAuthFromUrl: () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userParam = params.get('user');

    if (token) {
      setToken(token);
      let user: UserProfile | null = null;
      if (userParam) {
        try {
          user = JSON.parse(decodeURIComponent(userParam));
        } catch {
          user = {
            id: 'current-user',
            github_id: 0,
            github_login: 'User',
            email: null,
            avatar_url: null,
            plan: 'free',
          };
        }
      } else {
        user = {
          id: 'current-user',
          github_id: 0,
          github_login: 'User',
          email: null,
          avatar_url: null,
          plan: 'free',
        };
      }

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Clean token from browser history/address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }

    return false;
  },
}));
