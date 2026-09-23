import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { handleOAuthCallback } from '../api/integrations';
import { useIntegrationStore } from '../store/integrationStore';
import toast from 'react-hot-toast';

export type CallbackStatus = 'loading' | 'success' | 'error';

export function useOAuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | undefined>();
  const fetchIntegrations = useIntegrationStore((state) => state.fetchIntegrations);

  const processCallback = useCallback(async () => {
    setStatus('loading');
    setError(null);

    const code = searchParams.get('code');
    const state = searchParams.get('state') || 'gmail';
    const errorParam = searchParams.get('error');

    if (errorParam) {
      const errMsg = `Google authorization failed: ${errorParam}`;
      setError(errMsg);
      setStatus('error');
      toast.error(errMsg);
      return;
    }

    if (!code) {
      const errMsg = 'No authorization code found in URL parameters.';
      setError(errMsg);
      setStatus('error');
      return;
    }

    try {
      const res = await handleOAuthCallback({ code, state, error: errorParam || undefined });
      setProvider(res.provider || (state === 'google_drive' ? 'google_drive' : 'gmail'));
      setStatus('success');
      toast.success(res.message || 'Account connected successfully!');
      await fetchIntegrations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize OAuth authorization with backend';
      setError(msg);
      setStatus('error');
      toast.error(msg);
    }
  }, [searchParams, fetchIntegrations]);

  useEffect(() => {
    processCallback();
  }, [processCallback]);

  return {
    status,
    error,
    provider,
    retry: processCallback,
  };
}
