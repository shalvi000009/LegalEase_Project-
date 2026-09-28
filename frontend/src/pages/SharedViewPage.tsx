import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, AlertTriangle, ArrowRight, Lock, ExternalLink, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getSharedAnalysis } from '../api/reports';

export const SharedViewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      setLoading(true);
      try {
        const res = await getSharedAnalysis(token);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'This share link has expired or is invalid.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-300 font-medium">Loading Shared Contract Analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-slate-800 bg-slate-900">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Link Expired or Invalid</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This shared contract analysis link is no longer available.'}
          </p>
          <Button onClick={() => navigate('/register')} className="w-full">
            Create Free LegalEase Account
          </Button>
        </Card>
      </div>
    );
  }

  const riskScore = data.overall_risk_score ?? 42;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Shared View Top Watermark Banner */}
      <header className="bg-gradient-to-r from-indigo-900/90 to-violet-900/90 border-b border-indigo-700/50 py-3 px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
              LE
            </div>
            <span className="font-bold text-sm text-white">LegalEase</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
              Read-Only Shared Report
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-200 hidden sm:inline">Want to analyze your own contracts?</span>
            <Button
              size="xs"
              onClick={() => navigate('/register')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold"
            >
              Try LegalEase Free
            </Button>
          </div>
        </div>
      </header>

      {/* Main Analysis Summary View */}
      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-8">
        {/* Document Header Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white truncate max-w-md">{data.filename}</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Analyzed on {new Date(data.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Overall Risk Score Badge */}
              <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overall Risk Score</span>
                  <span className="text-xl font-black text-white">{riskScore}/100</span>
                </div>
                <Badge
                  variant={riskScore >= 70 ? 'danger' : riskScore >= 40 ? 'warning' : 'success'}
                  className="px-3 py-1 text-xs font-bold"
                >
                  {riskScore >= 70 ? 'High Risk' : riskScore >= 40 ? 'Medium Risk' : 'Low Risk'}
                </Badge>
              </div>
            </div>

            {/* AI Summary */}
            {data.summary && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Executive Summary
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">{data.summary}</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Classified Clauses List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Classified Risk Clauses ({data.clauses?.length || 0})
          </h2>

          <div className="space-y-3">
            {data.clauses?.map((clause: any) => (
              <Card key={clause.id} className="p-5 bg-slate-900 border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={clause.risk_level === 'high' ? 'danger' : clause.risk_level === 'medium' ? 'warning' : 'info'}
                    >
                      {clause.clause_type}
                    </Badge>
                    <span className="text-xs text-slate-400">Risk Score: {clause.risk_score}/100</span>
                  </div>
                  {clause.page && <span className="text-xs text-slate-500 font-mono">Page {clause.page}</span>}
                </div>

                <p className="text-xs text-slate-300 font-medium leading-relaxed">{clause.explanation}</p>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400 italic">
                  "{clause.original_text}"
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Guest Lock CTA Banner */}
        <Card className="p-6 bg-gradient-to-r from-indigo-950 to-slate-900 border-indigo-900 text-center space-y-3">
          <Lock className="w-6 h-6 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Interactive RAG Chat & Custom Risk Editing Locked</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This read-only link displays verified contract findings. Sign up for LegalEase to ask unlimited AI questions and run custom clause scans.
          </p>
          <Button
            onClick={() => navigate('/register')}
            className="shadow-lg"
            iconRight={<ExternalLink className="w-4 h-4" />}
          >
            Create Your Free Account
          </Button>
        </Card>
      </main>
    </div>
  );
};
