import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loginUser, registerUser, logoutUser } from '../api/auth';
import { LoginCredentials, RegisterData } from '../types/auth';
import toast from 'react-hot-toast';

export function useAuth() {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated, isHydrated, isLoading, setAuth, logout: clearAuthStore } = useAuthStore();

  const login = async (credentials: LoginCredentials, redirectTo = '/dashboard') => {
    try {
      useAuthStore.setState({ isLoading: true });
      const response = await loginUser(credentials);
      setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      toast.success(`Welcome back, ${response.user.name || 'User'}!`);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      // Error handled by client interceptor/component
      throw err;
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const register = async (data: RegisterData, redirectTo = '/dashboard') => {
    try {
      useAuthStore.setState({ isLoading: true });
      const response = await registerUser(data);
      setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      toast.success('Account created! Welcome to LegalEase.');
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      throw err;
    } finally {
      useAuthStore.setState({ isLoading: false });
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout api errors
    } finally {
      clearAuthStore();
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isHydrated,
    isLoading,
    login,
    register,
    logout,
  };
}
