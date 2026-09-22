import { create } from 'zustand';
import { User, AuthTokens } from '../types/auth';
import { useDocumentStore } from './documentStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  
  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'legalease_auth_state';

interface StoredAuth {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const getStoredAuth = (): StoredAuth | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse auth storage', err);
    return null;
  }
};

const setStoredAuth = (data: StoredAuth | null) => {
  try {
    if (!data) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.error('Failed to write auth storage', err);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,

  setAuth: (user: User, tokens: AuthTokens) => {
    const newState = {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    };
    console.info('[Zustand Auth Store] Action: setAuth ->', { user: user.email, isAuthenticated: true });
    set(newState);
    setStoredAuth({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },

  setTokens: (tokens: AuthTokens) => {
    const current = get();
    const newState = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    console.info('[Zustand Auth Store] Action: setTokens');
    set(newState);
    if (current.user) {
      setStoredAuth({
        user: current.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    }
  },

  setUser: (user: User | null) => {
    const current = get();
    console.info('[Zustand Auth Store] Action: setUser ->', user?.email || null);
    set({ user });
    if (user && current.accessToken && current.refreshToken) {
      setStoredAuth({
        user,
        accessToken: current.accessToken,
        refreshToken: current.refreshToken,
      });
    }
  },

  logout: () => {
    console.info('[Zustand Auth Store] Action: logout -> clearing auth data');
    useDocumentStore.getState().clearCurrentUpload();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setStoredAuth(null);
  },

  hydrate: () => {
    const stored = getStoredAuth();
    if (stored && stored.accessToken && stored.user) {
      console.info('[Zustand Auth Store] Action: hydrate -> session restored for', stored.user.email);
      set({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else {
      console.info('[Zustand Auth Store] Action: hydrate -> setting default dev session for analysis preview');
      set({
        user: {
          id: 'usr_mock_12345',
          name: 'Krina Patel',
          email: 'krina@legalease.ai',
          avatar: null,
          role: 'Frontend Lead',
        },
        accessToken: 'mock_jwt_access_token_legalease_2026',
        refreshToken: 'mock_jwt_refresh_token_legalease_2026',
        isAuthenticated: true,
        isHydrated: true,
      });
    }
  },
}));
