import React from 'react';
import { Shield } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { EmptyState } from '../components/ui/EmptyState';

export const VaultPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contract Vault</h1>
          <p className="text-xs text-slate-500">Encrypted document storage & security policies</p>
        </div>

        <EmptyState
          icon={Shield}
          title="Secure Contract Vault"
          description="Contract vault features including 256-bit encryption, role-based access control, and auto-archive will be active in upcoming releases."
          actionLabel="Upload New Contract"
          actionHref="/upload"
        />
      </div>
    </MainLayout>
  );
};
