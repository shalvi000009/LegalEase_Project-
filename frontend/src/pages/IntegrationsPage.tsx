import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, HardDrive, Shield, RefreshCw } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { IntegrationCard } from '../components/integrations/IntegrationCard';
import { ForwardingAddressCard } from '../components/integrations/ForwardingAddressCard';
import { ConnectModal } from '../components/integrations/ConnectModal';
import { DisconnectModal } from '../components/integrations/DisconnectModal';
import { ScanHistoryTable } from '../components/integrations/ScanHistoryTable';
import { useIntegrationStore } from '../store/integrationStore';
import { useOAuth } from '../hooks/useOAuth';
import { IntegrationProvider } from '../types/integrations';

export const IntegrationsPage: React.FC = () => {
  const { integrations, fetchIntegrations, removeIntegration, isLoading } = useIntegrationStore();
  const { connect, isConnecting } = useOAuth();

  const [connectModalProvider, setConnectModalProvider] = useState<IntegrationProvider | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; providerTitle: string; email?: string } | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const safeIntegrations = Array.isArray(integrations) ? integrations : [];
  const gmailIntegration = safeIntegrations.find((i) => i.provider === 'gmail');
  const driveIntegration = safeIntegrations.find((i) => i.provider === 'google_drive');

  const handleOpenConnect = (provider: IntegrationProvider) => {
    setConnectModalProvider(provider);
  };

  const handleConfirmConnect = () => {
    if (connectModalProvider) {
      const provider = connectModalProvider;
      setConnectModalProvider(null);
      connect(provider, false);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (disconnectTarget) {
      const id = disconnectTarget.id;
      setDisconnectTarget(null);
      await removeIntegration(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                Auto-Scan Integrations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Connected Accounts
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Automatically detect legal contracts in your inbox, cloud drives, and forwarded emails
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchIntegrations()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Integration Cards Grid with Stagger Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Gmail Card */}
          <IntegrationCard
            provider="gmail"
            icon={Mail}
            title="Gmail Ingestion"
            description="Auto-scan emails for PDF & DOCX agreements, non-disclosure agreements, and invoices."
            status={gmailIntegration?.isActive ? 'active' : 'inactive'}
            accountEmail={gmailIntegration?.email}
            lastScanned={gmailIntegration?.lastScannedAt}
            onConnect={() => handleOpenConnect('gmail')}
            onDisconnect={() =>
              setDisconnectTarget({
                id: gmailIntegration?.id || '',
                providerTitle: 'Gmail',
                email: gmailIntegration?.email,
              })
            }
            isLoading={isConnecting && connectModalProvider === 'gmail'}
          />

          {/* Google Drive Card */}
          <IntegrationCard
            provider="google_drive"
            icon={HardDrive}
            title="Google Drive Sync"
            description="Watch cloud folders for contract additions, updates, and renewal schedule changes."
            status={driveIntegration?.isActive ? 'active' : 'inactive'}
            accountEmail={driveIntegration?.email}
            lastScanned={driveIntegration?.lastScannedAt}
            onConnect={() => handleOpenConnect('google_drive')}
            onDisconnect={() =>
              setDisconnectTarget({
                id: driveIntegration?.id || '',
                providerTitle: 'Google Drive',
                email: driveIntegration?.email,
              })
            }
            isLoading={isConnecting && connectModalProvider === 'google_drive'}
          />

          {/* Email Forwarding Card */}
          <ForwardingAddressCard address="yourname@docs.legalease.in" />
        </motion.div>

        {/* Security Banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-indigo-950 dark:text-indigo-200">
              Enterprise Grade Privacy & Token Encryption
            </p>
            <p className="text-indigo-700 dark:text-indigo-300/80 mt-0.5">
              LegalEase uses read-only OAuth scopes. OAuth tokens are encrypted at rest with AES-256. Raw email contents are never stored permanently.
            </p>
          </div>
        </div>

        {/* Scan History Log Table */}
        <div className="pt-2">
          <ScanHistoryTable />
        </div>
      </div>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectModalProvider}
        provider={connectModalProvider}
        onClose={() => setConnectModalProvider(null)}
        onConfirm={handleConfirmConnect}
        isConnecting={isConnecting}
      />

      {/* Disconnect Modal */}
      <DisconnectModal
        isOpen={!!disconnectTarget}
        providerTitle={disconnectTarget?.providerTitle}
        accountEmail={disconnectTarget?.email}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleConfirmDisconnect}
      />
    </MainLayout>
  );
};
