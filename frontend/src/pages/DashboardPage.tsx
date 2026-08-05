import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileCheck, ShieldAlert, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Documents Analyzed',
      value: '0',
      change: 'Ready for upload',
      icon: <FileCheck className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: 'Active Contracts',
      value: '0',
      change: 'No active monitoring',
      icon: <Clock className="w-5 h-5 text-emerald-500" />,
    },
    {
      title: 'High Risk Alerts',
      value: '0',
      change: 'All clear',
      icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-2 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Week 1 Environment Setup Complete</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Legal Engineer'}!
            </h1>
            <p className="text-sm text-indigo-100/90 leading-relaxed">
              Your LegalEase workspace is ready. Upload a contract to trigger automated PDF OCR extraction, Legal-BERT clause classification, and 0-100 risk scoring.
            </p>
          </div>

          <div className="z-10 shrink-0">
            <Button
              size="lg"
              onClick={() => navigate('/upload')}
              className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-black/10 border-none font-bold"
              iconLeft={<UploadCloud className="w-5 h-5" />}
            >
              Upload Your First Contract
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * idx }}
            >
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {stat.value}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">{stat.change}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                  {stat.icon}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Empty State Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="p-12 text-center border-dashed border-2 border-slate-300 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              No Contracts Uploaded Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              Drag and drop PDF or scanned contract documents here, or click below to start the upload pipeline.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => navigate('/upload')}
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                Go to Upload Pipeline
              </Button>
              <Badge variant="info">Week 2 Target Feature</Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
};
