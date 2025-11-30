import { create } from 'zustand';
import {
  loginRequest,
  refreshSessionRequest,
  registerRequest,
  type AuthSuccessResponse,
  type AuthUser,
  type LoginResponse,
  type UserRole,
  type VerificationStatus,
  verifyEmailCode,
  verifyPhoneCode,
  resendVerificationCode,
  type RegisterPayload
} from '../api/auth';
import { useUiStore } from './uiStore';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  verification: VerificationStatus | null;
  loading: boolean;
  error: string | null;
  login: (input: { email: string; password: string; mfaCode?: string; challengeId?: string }) => Promise<void>;
  register: (input: RegisterPayload) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  refreshSession: () => Promise<string | null>;
  verifyEmail: (code: string) => Promise<void>;
  verifyPhone: (code: string) => Promise<void>;
  resendVerification: (channel: 'email' | 'phone') => Promise<void>;
}

interface StoredSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  verification: VerificationStatus | null;
}

const STORAGE_KEY = 'ddms_auth_session';

const mapRoleToUi = (role: UserRole): 'hq' | 'distributor' | 'dealer' | 'field' => {
  switch (role) {
    case 'admin':
      return 'hq';
    case 'distributor':
      return 'distributor';
    case 'dealer':
      return 'dealer';
    default:
      return 'field';
  }
};

const readSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      !parsed ||
      !parsed.user ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
};

const persistSession = (session: StoredSession): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

const clearSession = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

const setRoleFromUser = (user?: AuthUser | null) => {
  if (user) {
    useUiStore.getState().setRole(mapRoleToUi(user.role));
  } else {
    useUiStore.getState().setRole('hq');
  }
};

const buildSessionFromResponse = (result: AuthSuccessResponse): StoredSession => ({
  user: result.user,
  accessToken: result.tokens.accessToken,
  refreshToken: result.tokens.refreshToken,
  expiresAt: Date.now() + result.tokens.expiresIn,
  verification: result.verification
});

const initialSession = typeof window !== 'undefined' ? readSession() : null;
if (initialSession?.user) {
  setRoleFromUser(initialSession.user);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialSession?.user ?? null,
  accessToken: initialSession?.accessToken ?? null,
  refreshToken: initialSession?.refreshToken ?? null,
  tokenExpiresAt: initialSession?.expiresAt ?? null,
  verification: initialSession?.verification ?? null,
  loading: false,
  error: null,
  hydrate: () => {
    const session = readSession();
    if (session) {
      set({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenExpiresAt: session.expiresAt,
        verification: session.verification ?? null
      });
      setRoleFromUser(session.user);
    }
  },
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const result: LoginResponse = await loginRequest(credentials);
      if (result.status === 'mfa_required') {
        const message =
          result.method === 'sms'
            ? 'SMS verification required. Complete MFA enrollment before signing in.'
            : 'Authenticator code required. Complete MFA enrollment before signing in.';
        set({ loading: false, error: message });
        throw new Error(message);
      }
      const session = buildSessionFromResponse(result);
      persistSession(session);
      setRoleFromUser(session.user);
      set({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenExpiresAt: session.expiresAt,
        loading: false,
        verification: session.verification
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log in';
      set({
        error: message,
        loading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        verification: null
      });
      clearSession();
      setRoleFromUser(null);
      throw error;
    }
  },
  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const result = await registerRequest(payload);
      const session = buildSessionFromResponse(result);
      if (session.user.approvalStatus !== 'approved') {
        clearSession();
        setRoleFromUser(null);
        const message = 'Registration submitted for approval. You will be notified once approved.';
        set({
          loading: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          verification: null,
          error: message
        });
        throw new Error(message);
      }
      persistSession(session);
      setRoleFromUser(session.user);
      set({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenExpiresAt: session.expiresAt,
        loading: false,
        verification: session.verification
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register';
      set({ error: message, loading: false });
      throw error;
    }
  },
  refreshSession: async () => {
    const refreshToken = get().refreshToken ?? readSession()?.refreshToken ?? null;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    try {
      const result = await refreshSessionRequest(refreshToken);
      const session = buildSessionFromResponse(result);
      persistSession(session);
      setRoleFromUser(result.user);
      set({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenExpiresAt: session.expiresAt,
        verification: session.verification
      });
      return session.accessToken;
    } catch (error) {
      clearSession();
      setRoleFromUser(null);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        verification: null
      });
      throw error;
    }
  },
  logout: () => {
    clearSession();
    setRoleFromUser(null);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      verification: null
    });
  },
  verifyEmail: async (code) => {
    const verification = await verifyEmailCode(code);
    set({ verification });
  },
  verifyPhone: async (code) => {
    const verification = await verifyPhoneCode(code);
    set({ verification });
  },
  resendVerification: async (channel) => {
    await resendVerificationCode(channel);
  }
}));
