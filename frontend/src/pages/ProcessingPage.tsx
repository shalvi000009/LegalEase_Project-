import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Brain,
  Scale,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProcessingStep, StepStatus } from '../components/processing/ProcessingStep';
import { useDocumentStatus } from '../hooks/useDocumentStatus';
import { useAnalysisStore } from '../store/analysisStore';

const STEPS = [
  {
    id: 1,
    icon: <FileText className="w-5 h-5" />,
    label: 'Uploading document',
    subtitle: 'Reading your contract and preparing structure...',
  },
  {
    id: 2,
    icon: <Search className="w-5 h-5" />,
    label: 'Extracting text',
    subtitle: 'Looking for important clauses and legal definitions...',
  },
  {
    id: 3,
    icon: <Brain className="w-5 h-5" />,
    label: 'Identifying clauses',
    subtitle: 'Checking for unfair terms and party obligations...',
  },
  {
    id: 4,
    icon: <Scale className="w-5 h-5" />,
    label: 'Analyzing risks',
    subtitle: 'Calculating your risk score with AI Legal-BERT...',
  },
  {
    id: 5,
    icon: <Sparkles className="w-5 h-5" />,
    label: 'Generating summary',
    subtitle: 'Almost there! Preparing final plain-English report...',
  },
];

// Confetti Particle Component
const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
  const color = colors[index % colors.length];
  const randomX = (Math.random() - 0.5) * 800;
  const randomY = -100 - Math.random() * 400;
  const randomRotate = Math.random() * 720;
  const randomScale = 0.6 + Math.random() * 0.8;

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: randomScale, rotate: 0 }}
      animate={{ opacity: 0, x: randomX, y: randomY, rotate: randomRotate }}
      transition={{ duration: 1.8, ease: 'easeOut', delay: (index % 10) * 0.03 }}
      style={{ backgroundColor: color }}
      className="absolute w-3 h-3 rounded-sm z-50 pointer-events-none shadow-sm"
    />
  );
};

export const ProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/upload');
    }
  }, [id, navigate]);

  const docId = id || '';

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchAnalysis = useAnalysisStore((state) => state.fetchAnalysis);

  // Poll backend document status
  const { status: polledStatus } = useDocumentStatus(docId, true);

  // Simulated progression synchronized with polling status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  // Handle final completion & confetti redirection
  useEffect(() => {
    if (currentStepIndex === STEPS.length - 1 || polledStatus === 'completed') {
      setShowConfetti(true);

      // Pre-fetch analysis into Zustand store
      fetchAnalysis(docId).catch(() => {});

      const redirectTimer = setTimeout(() => {
        navigate(`/documents/${docId}/results`);
      }, 1600);

      return () => clearTimeout(redirectTimer);
    }
  }, [currentStepIndex, polledStatus, docId, navigate, fetchAnalysis]);

  const getStepStatus = (stepIdx: number): StepStatus => {
    if (stepIdx < currentStepIndex) return 'completed';
    if (stepIdx === currentStepIndex) return 'active';
    return 'pending';
  };

  const handleCancel = () => {
    navigate('/upload');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Animated Subtle Background Gradient Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      {/* Confetti Explosion Layer */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          {Array.from({ length: 60 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Top Bar */}
      <header className="relative z-10 max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            Legal<span className="text-indigo-400">Ease</span>
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-slate-400 hover:text-white hover:bg-slate-800/60"
          iconLeft={<ArrowLeft className="w-4 h-4" />}
        >
          Cancel & Return
        </Button>
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 max-w-xl mx-auto w-full my-auto py-8">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40">
          {/* Centered Scanning Document Visualizer */}
          <div className="relative flex flex-col items-center justify-center mb-8">
            <div className="relative">
              {/* Outer Pulsing Aura */}
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 blur-xl animate-pulse" />

              {/* Scanning Box */}
              <div className="relative w-24 h-28 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
                <FileText className="w-10 h-10 text-indigo-400" />

                {/* Animated Scanning Light Beam Line */}
                <motion.div
                  animate={{ y: [-40, 40, -40] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-300 to-indigo-500 shadow-lg shadow-indigo-400"
                />
              </div>

              {/* Status Badge Tag */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="w-3 h-3 animate-spin" /> AI SCANNING
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mt-6 text-center">
              Analyzing Contract Clauses
            </h2>
            <p className="text-xs text-slate-400 text-center mt-1">
              Document ID: <span className="font-mono text-indigo-300">{docId.substring(0, 16)}</span>
            </p>
          </div>

          {/* Staggered Animated Steps List */}
          <div className="space-y-3">
            {STEPS.map((step, idx) => (
              <ProcessingStep
                key={step.id}
                stepNumber={idx + 1}
                icon={step.icon}
                label={step.label}
                subtitle={step.subtitle}
                status={getStepStatus(idx)}
              />
            ))}
          </div>

          {/* Estimated Time Footer Info */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>This usually takes 30–60 seconds</span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>PyMuPDF Engine Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full text-center text-xs text-slate-500">
        LegalEase Contract Intelligence Platform &copy; 2026
      </footer>
    </div>
  );
};
