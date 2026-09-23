import { useState, useCallback } from 'react';
import { IntegrationProvider } from '../types/integrations';
import { connectGmail, connectGoogleDrive } from '../api/integrations';
import { useIntegrationStore } from '../store/integrationStore';
import toast from 'react-hot-toast';

export function useOAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setStoreConnecting = useIntegrationStore((state) => state.setIsConnecting);

  const connect = useCallback(async (provider: IntegrationProvider, usePopup: boolean = false) => {
    setIsConnecting(true);
    setStoreConnecting(true);
    setError(null);

    try {
      let result: { authUrl: string };
      if (provider === 'gmail') {
        result = await connectGmail();
      } else if (provider === 'google_drive') {
        result = await connectGoogleDrive();
      } else {
        throw new Error('Unsupported OAuth provider');
      }

      if (!result.authUrl) {
        throw new Error('Failed to retrieve authorization URL from server.');
      }

      if (usePopup) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          result.authUrl,
          `LegalEase_OAuth_${provider}`,
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        if (!popup) {
          toast.error('Popup blocked by browser. Redirecting to Google authorization...');
          window.location.href = result.authUrl;
        }
      } else {
        // Direct redirect
        window.location.href = result.authUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate OAuth authorization flow';
      setError(msg);
      toast.error(msg);
      setIsConnecting(false);
      setStoreConnecting(false);
    }
  }, [setStoreConnecting]);

  return {
    connect,
    isConnecting,
    error,
  };
}
