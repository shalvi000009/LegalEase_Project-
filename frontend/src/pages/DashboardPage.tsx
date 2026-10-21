import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  FileText,
  Sparkles,
  Bot,
  Shield,
  Radio,
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { documents, pagination, isLoading } = useDocuments();

  const totalDocs = pagination.total || documents.length;
  const activeContracts = documents.filter(
    (d) => d.status === 'completed' || d.status === 'done'
  ).length;
  const highRiskAlerts = documents.filter((d) => (d.riskScore ?? 0) >= 70).length;

  const stats = [
    {
      title: 'Documents Analyzed',
      value: isLoading ? '...' : totalDocs.toString(),
      change: totalDocs > 0 ? `${totalDocs} total stored` : 'Ready for upload',
      icon: <FileCheck className="w-5 h-5 text-indigo-500" />,
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      title: 'Active Contracts',
      value: isLoading ? '...' : activeContracts.toString(),
      change: activeContracts > 0 ? 'Analyzed and monitored' : 'No active monitoring',
      icon: <Clock className="w-5 h-5 text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      title: 'High Risk Alerts',
      value: isLoading ? '...' : highRiskAlerts.toString(),
      change: highRiskAlerts > 0 ? 'Requires legal review' : 'All clear',
      icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
      bg: 'bg-rose-50 dark:bg-rose-950/50',
    },
  ];

  const recentDocs = documents.slice(0, 4);

  return (
    <MainLayout>
      <div className="space-y-8 pb-12 max-w-7xl mx-auto">
        {/* Welcome Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          {/* Subtle background glow effect */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Legal Intelligence Platform v2.0</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Legal Counsel'}!
            </h1>
            <p className="text-sm text-indigo-100/90 leading-relaxed">
              Automate contract clause classification, uncover hidden liabilities, check compliance checklists, and chat with your legal documents using AI.
            </p>
          </div>

          <div className="z-10 shrink-0 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/upload')}
              className="bg-white text-indigo-800 hover:bg-indigo-50 shadow-xl shadow-black/20 border-none font-bold"
              iconLeft={<UploadCloud className="w-5 h-5" />}
            >
              Upload Contract
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/vault')}
              className="text-white border-white/30 hover:bg-white/10 font-bold"
              iconLeft={<Shield className="w-5 h-5" />}
            >
              Open Vault
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
              <Card className="flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                    {stat.value}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">{stat.change}</p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg} shrink-0`}>
                  {stat.icon}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Contracts Section */}
        {recentDocs.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Recent Contracts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quick access to your most recently uploaded and analyzed agreements
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/documents')}
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                View All ({totalDocs})
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentDocs.map((doc) => {
                const score = doc.riskScore;
                const isHighRisk = score !== null && score >= 70;
                const isMediumRisk = score !== null && score >= 40 && score < 70;

                return (
                  <Card
                    key={doc.id}
                    className="p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <Badge
                          variant={
                            doc.status === 'completed' || doc.status === 'done'
                              ? 'success'
                              : doc.status === 'failed'
                              ? 'danger'
                              : 'info'
                          }
                          size="sm"
                        >
                          {doc.status === 'done' ? 'completed' : doc.status}
                        </Badge>
                      </div>

                      <h3
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(doc.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Risk Score:</span>
                        {score !== null ? (
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              isHighRisk
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : isMediumRisk
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {score}/100
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px]">Pending</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => navigate(`/documents/${doc.id}/results`)}
                          className="w-full text-[11px]"
                        >
                          Results
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => navigate(`/documents/${doc.id}/chat`)}
                          iconLeft={<Bot className="w-3.5 h-3.5" />}
                          className="w-full text-[11px]"
                        >
                          Chat
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* Action Empty State Card */
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
              </div>
            </Card>
          </motion.div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card className="p-6 space-y-3 border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Clause Analysis</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Classify clauses across 12 legal categories using Legal-BERT, evaluate mutual vs unilateral liability, and spot dangerous terms.
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/upload')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="px-0 text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              Analyze a Document
            </Button>
          </Card>

          <Card className="p-6 space-y-3 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Shield className="w-4 h-4" />
              <span>Contract Vault & Deadlines</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Auto-extract expiry dates, notice deadlines, and renewal lock-ins into your interactive calendar with customizable reminders.
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/vault')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="px-0 text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              Explore Contract Vault
            </Button>
          </Card>

          <Card className="p-6 space-y-3 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
              <Radio className="w-4 h-4" />
              <span>Auto-Scan Integrations</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Connect Gmail, Google Drive, or forward contract emails to your dedicated LegalEase address for automatic background ingestion.
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/integrations')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="px-0 text-purple-600 dark:text-purple-400 font-semibold"
            >
              Manage Integrations
            </Button>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};
