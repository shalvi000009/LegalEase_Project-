import { z } from 'zod';
import { apiPost } from './client';
import { AuthResponse, LoginCredentials, RegisterData } from '../types/auth';

// Zod Validation Schemas
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms & conditions' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Mock data fallback for offline / development before Shalvi's backend endpoints go live
const MOCK_USER = {
  id: 'usr_mock_12345',
  name: 'Krina Patel',
  email: 'krina@legalease.ai',
  avatar: null,
  role: 'Frontend Lead',
};

const MOCK_TOKENS = {
  accessToken: 'mock_jwt_access_token_legalease_2026',
  refreshToken: 'mock_jwt_refresh_token_legalease_2026',
};

/**
 * Login User API
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // TODO: Replace with real API call to POST /auth/login when Shalvi's endpoint is live
    return await apiPost<AuthResponse>('/auth/login', credentials);
  } catch (err: unknown) {
    // If the server responded with an error (e.g. 401 Unauthorized), do not fall back to the mock user.
    if (err && typeof err === 'object' && 'response' in err && (err as any).response) {
      throw err;
    }
    const errorObj = err as { message?: string };
    console.warn('[AUTH API] Backend endpoint /auth/login unreachable, falling back to stubbed response for testing:', errorObj.message);
    
    // Simulate network latency
    await new Promise((res) => setTimeout(res, 600));

    if (credentials.password === 'wrong' || credentials.password === 'wrongpassword' || credentials.password === '123') {
      throw new Error('Invalid email or password. Please try again.');
    }
    
    return {
      user: {
        ...MOCK_USER,
        email: credentials.email,
        name: credentials.email.split('@')[0].replace('.', ' '),
      },
      ...MOCK_TOKENS,
    };
  }
}

/**
 * Register User API
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    // TODO: Replace with real API call to POST /auth/register when Shalvi's endpoint is live
    return await apiPost<AuthResponse>('/auth/register', {
      name: data.name,
      email: data.email,
      password: data.password,
    });
  } catch (err: unknown) {
    // If the server responded with an error (e.g. 409 Conflict), do not fall back to the mock user.
    if (err && typeof err === 'object' && 'response' in err && (err as any).response) {
      throw err;
    }
    const errorObj = err as { message?: string };
    console.warn('[AUTH API] Backend endpoint /auth/register unreachable, falling back to stubbed response for testing:', errorObj.message);
    
    await new Promise((res) => setTimeout(res, 600));
    
    return {
      user: {
        ...MOCK_USER,
        name: data.name,
        email: data.email,
      },
      ...MOCK_TOKENS,
    };
  }
}

/**
 * Refresh Auth Tokens API
 */
export async function refreshAuthTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // TODO: Replace with real API call to POST /auth/refresh when Shalvi's endpoint is live
  return await apiPost('/auth/refresh', { refreshToken });
}

/**
 * Logout API
 */
export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    // TODO: Replace with real API call to POST /auth/logout when Shalvi's endpoint is live
    return await apiPost('/auth/logout');
  } catch {
    return { success: true };
  }
}
