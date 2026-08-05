import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Check, X, UserPlus } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/forms/FormField';
import { registerSchema, RegisterInput } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export const RegisterPage: React.FC = () => {
  const { register: registerAccount, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: true,
    },
  });

  const passwordValue = watch('password', '');

  // Password strength calculation
  const hasMinLength = passwordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue);

  const passedChecksCount = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  let strengthWidth = 'w-1/4';

  if (passedChecksCount === 2 || passedChecksCount === 3) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-amber-500';
    strengthWidth = 'w-2/3';
  } else if (passedChecksCount === 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthWidth = 'w-full';
  }

  const onSubmit = async (data: RegisterInput) => {
    try {
      setServerError(null);
      await registerAccount(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setServerError(errorObj?.response?.data?.message || errorObj?.message || 'Failed to create account');
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start evaluating contracts with AI-driven risk scoring"
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
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
            animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{serverError}</span>
          </motion.div>
        )}

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <FormField
            label="Full Name"
            placeholder="Jane Doe"
            autoComplete="name"
            iconLeft={<User className="w-4 h-4" />}
            error={errors.name?.message}
            register={register('name')}
          />
        </motion.div>

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
            autoComplete="new-password"
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

          {/* Real-time Password Strength Indicator */}
          {passwordValue.length > 0 && (
            <div className="mt-2 space-y-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Password Strength:</span>
                <span className={cn(
                  passedChecksCount === 4 ? 'text-emerald-600' : passedChecksCount >= 2 ? 'text-amber-600' : 'text-red-500'
                )}>
                  {strengthLabel}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={cn('h-full transition-all duration-300', strengthColor, strengthWidth)} />
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className={cn('flex items-center gap-1', hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400')}>
                  {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Min 8 characters</span>
                </div>
                <div className={cn('flex items-center gap-1', hasUppercase ? 'text-emerald-600 font-semibold' : 'text-slate-400')}>
                  {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>1 Uppercase letter</span>
                </div>
                <div className={cn('flex items-center gap-1', hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400')}>
                  {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>1 Number</span>
                </div>
                <div className={cn('flex items-center gap-1', hasSpecial ? 'text-emerald-600 font-semibold' : 'text-slate-400')}>
                  {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>1 Special character</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <FormField
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            iconLeft={<Lock className="w-4 h-4" />}
            iconRight={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.confirmPassword?.message}
            register={register('confirmPassword')}
          />
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              {...register('termsAccepted')}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            />
            <span>
              I agree to the{' '}
              <a href="#terms" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Privacy Policy
              </a>.
            </span>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs font-medium text-red-500 mt-1">⚠️ {errors.termsAccepted.message}</p>
          )}
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="pt-2">
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            iconLeft={<UserPlus className="w-4 h-4" />}
          >
            Create Account
          </Button>
        </motion.div>

        <motion.p
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2"
        >
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.form>
    </AuthLayout>
  );
};
