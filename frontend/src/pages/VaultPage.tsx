import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Calendar as CalendarIcon, 
  Download, 
  Plus, 
  Bell, 
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

import { MainLayout } from '../components/layout/MainLayout';
import { useVault } from '../hooks/useVault';
import { useReminders } from '../hooks/useReminders';
import { useDateStore } from '../store/dateStore';
import { VaultStats } from '../components/vault/VaultStats';
import { VaultFilters } from '../components/vault/VaultFilters';
import { ContractCard } from '../components/vault/ContractCard';
import { ContractCardSkeleton } from '../components/vault/ContractCardSkeleton';
import { DeadlineCalendar } from '../components/vault/DeadlineCalendar';
import { ReminderList } from '../components/reminders/ReminderList';
import { DateConfirmationModal } from '../components/dates/DateConfirmationModal';
import { exportCalendar } from '../api/reminders';


type ActiveTab = 'vault' | 'calendar' | 'reminders';

export const VaultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Active sub-view tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    location.pathname.includes('/calendar') ? 'calendar' : 'vault'
  );

  const {
    contracts,
    allContracts,
    stats,
    filters,
    isLoading,
    updateContractStatus,
    deleteContract,
    setFilters,
    resetFilters,
    toggleViewMode,
  } = useVault();

  const { reminders, snoozeReminder, resolveReminder } = useReminders();

  // Date Confirmation Modal state
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const {
    dates,
    fetchDates,
    confirmDate,
    confirmAllDates,
    updateDate,
    deleteDate,
    addDate,
  } = useDateStore();

  useEffect(() => {
    if (location.pathname.includes('/calendar')) {
      setActiveTab('calendar');
    }
  }, [location.pathname]);

  const handleExportICS = async () => {
    try {
      const blob = await exportCalendar();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'legalease-deadlines.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('ICS Calendar file downloaded!');
    } catch (err) {
      toast.error('Failed to export calendar');
    }
  };

  const openDateModal = async (docId: string) => {
    setSelectedDocId(docId);
    await fetchDates(docId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-950/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Contract Vault</h1>
              <p className="text-xs text-slate-400">
                Centralized contract repository, deadline tracking, and reminder management.
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportICS}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export Calendar (.ics)
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Contract
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <VaultStats stats={stats} />

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('vault');
              navigate('/vault');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'vault'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            Vault Repository ({contracts.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('calendar');
              navigate('/vault/calendar');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Deadline Calendar
          </button>

          <button
            onClick={() => {
              setActiveTab('reminders');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all relative ${
              activeTab === 'reminders'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            Reminders
            {reminders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                {reminders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'vault' && (
          <motion.div
            key="vault-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filter Bar */}
            <VaultFilters
              filters={filters}
              onFilterChange={setFilters}
              onReset={resetFilters}
              onToggleView={toggleViewMode}
            />

            {/* Contracts List / Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <ContractCardSkeleton key={n} />
                ))}
              </div>
            ) : contracts.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No contracts in your vault yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Upload contracts or adjust your search filters to view your contracts.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-indigo-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Clear Filters
                </button>
              </div>
            ) : filters.viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onUpdateStatus={updateContractStatus}
                    onDelete={deleteContract}
                    onEditDates={(id) => openDateModal(id)}
                  />
                ))}
              </div>
            ) : (
              /* List View Table */
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Contract Name</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Expiry Date</th>
                        <th className="px-4 py-3">Days Remaining</th>
                        <th className="px-4 py-3">Risk Score</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {contracts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">
                            {c.name}
                            <div className="text-[10px] text-slate-400">{c.documentType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="capitalize text-[11px] font-semibold">
                              {c.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">{c.expiryDate}</td>
                          <td className="px-4 py-3 font-bold">
                            {c.daysRemaining <= 0 ? (
                              <span className="text-rose-400">Expired</span>
                            ) : (
                              <span className={c.daysRemaining <= 30 ? 'text-amber-400' : 'text-emerald-400'}>
                                {c.daysRemaining} days
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            <span className={c.riskScore > 60 ? 'text-rose-400' : 'text-emerald-400'}>
                              {c.riskScore}/100
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => openDateModal(c.id)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                              Edit Dates
                            </button>
                            <button
                              onClick={() =>
                                updateContractStatus(c.id, c.status === 'renewed' ? 'active' : 'renewed')
                              }
                              className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
                            >
                              {c.status === 'renewed' ? 'Renewed' : 'Mark Renewed'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div
            key="calendar-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DeadlineCalendar contracts={allContracts} />
          </motion.div>
        )}

        {activeTab === 'reminders' && (
          <motion.div
            key="reminders-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                Active Deadline Reminders
              </h3>
            </div>
            <ReminderList
              reminders={reminders}
              onSnooze={snoozeReminder}
              onResolve={resolveReminder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Confirmation Modal */}
      <DateConfirmationModal
        isOpen={!!selectedDocId}
        docTitle={allContracts.find((c) => c.id === selectedDocId)?.name || 'Contract'}
        dates={dates[selectedDocId || ''] || []}
        onConfirmDate={(dateId) => selectedDocId && confirmDate(selectedDocId, dateId)}
        onConfirmAll={() => selectedDocId && confirmAllDates(selectedDocId)}
        onUpdateDate={(dateId, data) => selectedDocId && updateDate(selectedDocId, dateId, data)}
        onDeleteDate={(dateId) => selectedDocId && deleteDate(selectedDocId, dateId)}
        onAddDate={(newDate) => selectedDocId && addDate(selectedDocId, newDate)}
        onClose={() => setSelectedDocId(null)}
        onProceed={() => {
          setSelectedDocId(null);
          navigate(`/results?id=${selectedDocId}`);
        }}
      />
      </div>
    </MainLayout>
  );
};
