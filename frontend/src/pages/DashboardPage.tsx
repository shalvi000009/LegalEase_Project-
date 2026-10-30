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
  Activity,
  CircleAlert,
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
      icon: <FileCheck className="w-5 h-5 text-[#5367ff]" />,
      bg: 'bg-indigo-50 dark:bg-indigo-400/10',
    },
    {
      title: 'Active Contracts',
      value: isLoading ? '...' : activeContracts.toString(),
      change: activeContracts > 0 ? 'Analyzed and monitored' : 'No active monitoring',
      icon: <Clock className="w-5 h-5 text-[#21b889]" />,
      bg: 'bg-emerald-50 dark:bg-emerald-400/10',
    },
    {
      title: 'High Risk Alerts',
      value: isLoading ? '...' : highRiskAlerts.toString(),
      change: highRiskAlerts > 0 ? 'Requires legal review' : 'All clear',
      icon: <ShieldAlert className="w-5 h-5 text-[#f05d5e]" />,
      bg: 'bg-rose-50 dark:bg-rose-400/10',
    },
  ];

  const recentDocs = documents.slice(0, 4);

  return (
    <MainLayout>
      <div className="space-y-7 pb-12">
        {/* Welcome Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-7 sm:p-9 lg:p-10 rounded-[28px] bg-[#0a1021] text-white shadow-2xl shadow-slate-950/20 relative overflow-hidden grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] items-center gap-8"
        >
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute -top-32 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.16em] uppercase text-cyan-100">
              <span className="signal-dot" />
              <span>Workspace live</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] leading-[1.06] font-black tracking-[-.04em]">
              Your legal posture,<br /><span className="text-[#2ed3c7]">in clear view.</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Good to see you, {user?.name || 'Counsel'}. Review risk signals, upcoming obligations, and contract intelligence without losing the thread.
            </p>
            <div className="z-10 shrink-0 flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => navigate('/upload')}
              className="bg-[#2ed3c7] text-[#0a1021] hover:bg-[#8cebe3] shadow-xl shadow-black/20 border-none font-bold"
              iconLeft={<UploadCloud className="w-5 h-5" />}
            >
              Upload Contract
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/vault')}
              className="text-white border-white/20 hover:bg-white/10 hover:text-white font-bold"
              iconLeft={<Shield className="w-5 h-5" />}
            >
              Open Vault
            </Button>
            </div>
          </div>
          <div className="relative z-10 flex justify-center lg:justify-end">
            <div className="relative w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-full border border-cyan-200/25 bg-white/[.035] shadow-[inset_0_0_55px_rgba(46,211,199,.08)]">
              <div className="absolute inset-5 rounded-full border border-cyan-200/20" />
              <div className="absolute inset-12 rounded-full border border-cyan-200/20" />
              <div className="radar-sweep absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 130deg, transparent 0deg, rgba(46,211,199,.22) 36deg, transparent 80deg)' }} />
              <div className="absolute left-[29%] top-[35%] w-2.5 h-2.5 rounded-full bg-[#2ed3c7] shadow-[0_0_16px_4px_rgba(46,211,199,.36)]" />
              <div className="radar-orbit absolute right-[23%] bottom-[28%] w-2 h-2 rounded-full bg-[#f0a53b] shadow-[0_0_14px_4px_rgba(240,165,59,.36)]" />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div><p className="text-4xl font-black tracking-[-.06em]">{highRiskAlerts}</p><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-400 mt-1">Risk signals</p></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * idx }}
            >
              <Card className="flex items-center justify-between p-5">
                <div>
                  <p className="eyebrow">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl font-black tracking-[-.05em] text-slate-900 dark:text-white mt-2">
                    {stat.value}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} shrink-0`}>
                  {stat.icon}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] gap-4">
          <Card hoverLift={false} className="p-0">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[.08]">
              <div><p className="eyebrow">Priority review</p><h2 className="mt-1 text-lg font-extrabold tracking-[-.03em]">Risk queue</h2></div>
              <CircleAlert className="w-5 h-5 text-[#f05d5e]" />
            </div>
            <div className="p-2">
              {(documents.filter(d => (d.riskScore ?? 0) >= 40).slice(0, 3)).map((doc) => (
                <button key={doc.id} onClick={() => navigate(`/documents/${doc.id}/results`)} className="w-full flex items-center gap-3 text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[.045] transition-colors">
                  <span className={`w-2 h-2 rounded-full ${(doc.riskScore ?? 0) >= 70 ? 'bg-[#f05d5e]' : 'bg-[#f0a53b]'}`} />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold truncate">{doc.filename}</span><span className="text-[11px] text-slate-500">Needs legal attention</span></span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{doc.riskScore}/100</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
              {documents.filter(d => (d.riskScore ?? 0) >= 40).length === 0 && <p className="px-3 py-5 text-xs text-slate-500">No elevated risk documents. Your queue is clear.</p>}
            </div>
          </Card>
          <Card hoverLift={false} className="p-5 bg-[#111a32] text-white border-0">
            <div className="flex items-center gap-2 text-[#2ed3c7]"><Activity className="w-4 h-4" /><span className="eyebrow text-cyan-200">Intelligence feed</span></div>
            <p className="mt-4 text-xl font-extrabold leading-tight tracking-[-.03em]">Your contract desk is monitoring continuously.</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">New uploads are classified, scored, and ready to discuss with your team.</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/integrations')} className="mt-5 border-cyan-300/30 text-cyan-200">Configure auto-scan</Button>
          </Card>
        </section>

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
                Drag and drop PDF or scanned contract documents here, or click below to upload.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => navigate('/upload')}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Go to Upload
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Card className="p-5 space-y-3 border-l-2 border-l-[#5367ff]">
            <div className="flex items-center gap-2 text-[#5367ff] dark:text-indigo-300">
              <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-400/10"><Sparkles className="w-4 h-4" /></span>
              <span className="eyebrow text-inherit">AI clause analysis</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Classify clauses across 12 legal categories using Legal-BERT, evaluate mutual vs unilateral liability, and spot dangerous terms.
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/upload')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="px-0 text-[#5367ff] dark:text-indigo-300 font-semibold"
            >
              Analyze a Document
            </Button>
          </Card>

          <Card className="p-5 space-y-3 border-l-2 border-l-[#2ed3c7]">
            <div className="flex items-center gap-2 text-[#159b91] dark:text-[#2ed3c7]">
              <span className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-300/10"><Shield className="w-4 h-4" /></span>
              <span className="eyebrow text-inherit">Vault & deadlines</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Auto-extract expiry dates, notice deadlines, and renewal lock-ins into your interactive calendar with customizable reminders.
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/vault')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="px-0 text-[#159b91] dark:text-[#2ed3c7] font-semibold"
            >
              Explore Contract Vault
            </Button>
          </Card>

          <Card className="p-5 space-y-3 border-l-2 border-l-[#f0a53b]">
            <div className="flex items-center gap-2 text-[#bd7415] dark:text-[#f0a53b]">
              <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-300/10"><Radio className="w-4 h-4" /></span>
              <span className="eyebrow text-inherit">Auto-scan integrations</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Connect Gmail, Google Drive, or forward contract emails to your dedicated LegalEase address for automatic background ingestion.
            </p>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/integrations')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="px-0 text-[#bd7415] dark:text-[#f0a53b] font-semibold"
            >
              Manage Integrations
            </Button>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};
