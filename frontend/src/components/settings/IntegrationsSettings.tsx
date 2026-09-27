import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, HardDrive, Shield } from 'lucide-react';
import { IntegrationCard } from '../integrations/IntegrationCard';
import { ForwardingAddressCard } from '../integrations/ForwardingAddressCard';
import { ConnectModal } from '../integrations/ConnectModal';
import { DisconnectModal } from '../integrations/DisconnectModal';
import { ScanHistoryTable } from '../integrations/ScanHistoryTable';
import { useIntegrationStore } from '../../store/integrationStore';
import { useOAuth } from '../../hooks/useOAuth';
import { IntegrationProvider } from '../../types/integrations';

export const IntegrationsSettings: React.FC = () => {
  const { integrations, fetchIntegrations, removeIntegration } = useIntegrationStore();
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
    <div className="space-y-8">
      {/* Integration Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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

      {/* Security Info Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
          LegalEase uses read-only OAuth 2.0 permissions. Scanned agreement attachments are hashed and matched against machine learning classifiers. No raw emails are saved.
        </p>
      </div>

      {/* Scan History Table */}
      <div className="pt-2">
        <ScanHistoryTable />
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
    </div>
  );
};
