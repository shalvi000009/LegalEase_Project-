import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ShieldAlert,
  Bell
} from 'lucide-react';
import { ContractSummary, ContractStatus } from '../../types/dates';

interface ContractCardProps {
  contract: ContractSummary;
  onUpdateStatus: (id: string, status: ContractStatus) => void;
  onDelete: (id: string) => void;
  onEditDates?: (id: string) => void;
}

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  onUpdateStatus,
  onDelete,
  onEditDates,
}) => {
  const navigate = useNavigate();

  // Status style configuration
  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'expiring_soon':
        return { label: 'Expiring Soon', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'expired':
        return { label: 'Expired', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'renewed':
        return { label: 'Renewed', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      default:
        return { label: 'Unknown', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
    }
  };

  const statusInfo = getStatusBadge(contract.status);

  // Days remaining logic
  const days = contract.daysRemaining;
  const isUrgent = days <= 7 && days > 0;
  const isExpired = days <= 0 || contract.status === 'expired';

  const getDaysBadgeStyle = () => {
    if (isExpired) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (isUrgent) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse';
    }
    if (days <= 30) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent triggering when clicking interactive buttons
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/results?id=${contract.id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      onClick={handleCardClick}
      className={`relative group cursor-pointer bg-slate-900/70 border rounded-2xl p-5 backdrop-blur-xl transition-all duration-300 ${
        isUrgent
          ? 'border-rose-500/40 hover:border-rose-500/60 shadow-lg shadow-rose-950/20'
          : isExpired
          ? 'border-rose-900/60 hover:border-rose-700/60 opacity-90'
          : 'border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-950/10'
      }`}
    >
      {/* Top Status Accent Border */}
      <div
        className={`absolute top-0 left-5 right-5 h-[2px] rounded-t-2xl ${
          isExpired
            ? 'bg-rose-500'
            : isUrgent
            ? 'bg-rose-400'
            : contract.status === 'expiring_soon'
            ? 'bg-amber-400'
            : 'bg-emerald-400'
        }`}
      />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/90 text-indigo-400 border border-slate-700/60 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
              {contract.name}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {contract.documentType || 'Legal Contract'}
            </span>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Middle Stats Grid */}
      <div className="my-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Expiry Date
          </span>
          <p className="font-semibold text-slate-200">{contract.expiryDate}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Days Remaining
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] border ${getDaysBadgeStyle()}`}>
            {isExpired ? (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Expired
              </span>
            ) : (
              `${days} days`
            )}
          </span>
        </div>
      </div>

      {/* Risk Score & Next Reminder */}
      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className={`w-3.5 h-3.5 ${contract.riskScore > 60 ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span className="text-slate-400">Risk Score:</span>
          <span className={`font-bold ${contract.riskScore > 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {contract.riskScore}/100
          </span>
        </div>

        {contract.nextReminder ? (
          <div className="relative group/bell flex items-center gap-1 text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            <Bell className="w-3.5 h-3.5 animate-bounce text-amber-400" />
            <span className="truncate max-w-[110px]">{contract.nextReminder}</span>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/bell:block w-48 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-200 shadow-xl z-20">
              <p className="font-bold text-white mb-0.5">Upcoming Reminder</p>
              <p className="text-slate-300">Alert set for: {contract.nextReminder}</p>
              <p className="text-[10px] text-slate-400 mt-1">Multi-channel alert enabled</p>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/settings');
            }}
            className="text-[11px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            title="Configure Reminders"
          >
            <Bell className="w-3 h-3" />
            <span>Set Reminder</span>
          </button>
        )}
      </div>

      {/* Actions Row */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            const nextStatus: ContractStatus = contract.status === 'renewed' ? 'active' : 'renewed';
            onUpdateStatus(contract.id, nextStatus);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
            contract.status === 'renewed'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Toggle Renewed Status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {contract.status === 'renewed' ? 'Renewed' : 'Mark Renewed'}
        </button>

        <div className="flex items-center gap-1">
          {onEditDates && (
            <button
              onClick={() => onEditDates(contract.id)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Edit Dates"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => navigate(`/results?id=${contract.id}`)}
            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition-colors"
            title="View Details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(contract.id)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
            title="Delete Contract"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
