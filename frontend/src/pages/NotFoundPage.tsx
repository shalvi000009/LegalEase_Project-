import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
          <FileQuestion className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Page Not Found</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The clause or page you are searching for does not exist or has been moved to another route.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            iconLeft={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            iconLeft={<Home className="w-4 h-4" />}
          >
            Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
