import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/forms/FormField';
import { loginSchema, LoginInput } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const state = location.state as { from?: { pathname?: string } } | null;
  const from = state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setServerError(null);
      await login(data, from);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setServerError(errorObj?.response?.data?.message || errorObj?.message || 'Invalid login credentials');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your LegalEase dashboard"
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
          },
        }}
      >
        {serverError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, x: [-8, 8, -6, 6, -3, 3, 0] }}
            transition={{ duration: 0.4 }}
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <span className="text-base">⚠️</span>
            <span>{serverError}</span>
          </motion.div>
        )}

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <FormField
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            iconLeft={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            register={register('email')}
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <FormField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            iconLeft={<Lock className="w-4 h-4" />}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            register={register('password')}
          />
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          className="flex items-center justify-between text-xs"
        >
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400 font-medium">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            />
            Remember me for 30 days
          </label>

          <a
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault();
              alert('Password reset link will be sent to your email.');
            }}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Forgot password?
          </a>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            iconRight={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Dashboard
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="relative my-6"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 dark:bg-slate-950 px-3 text-slate-400 font-semibold">
              Or continue with
            </span>
          </div>
        </motion.div>

        {/* Social Login Placeholder */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled
            title="Google OAuth coming soon"
            iconLeft={
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            }
          >
            Google OAuth (Enterprise SSO)
          </Button>
        </motion.div>

        <motion.p
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2"
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Create free account
          </Link>
        </motion.p>
      </motion.form>
    </AuthLayout>
  );
};
