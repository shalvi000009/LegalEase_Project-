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

/**
 * Login User API
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  return await apiPost<AuthResponse>('/auth/login', credentials);
}

/**
 * Register User API
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  return await apiPost<AuthResponse>('/auth/register', {
    name: data.name,
    email: data.email,
    password: data.password,
  });
}

/**
 * Refresh Auth Tokens API
 */
export async function refreshAuthTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return await apiPost('/auth/refresh', { refreshToken });
}

/**
 * Logout API
 */
export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    return await apiPost('/auth/logout');
  } catch {
    return { success: true };
  }
}
