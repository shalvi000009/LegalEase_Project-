import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { createShareLink, revokeShareLink } from '../api/reports';
import { ShareLink } from '../types/report';

export function useShareLink() {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateShareLink = useCallback(async (docId: string) => {
    setIsGenerating(true);
    setIsModalOpen(true);
    try {
      const linkData = await createShareLink(docId);
      setShareLink(linkData);
    } catch (err: any) {
      toast.error('Failed to create share link');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-https / older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      toast.success('Share link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  }, []);

  const revokeLink = useCallback(async (linkId: string) => {
    try {
      await revokeShareLink(linkId);
      setShareLink(null);
      setIsModalOpen(false);
      toast.success('Share link revoked');
    } catch (err) {
      toast.error('Failed to revoke share link');
    }
  }, []);

  return {
    shareLink,
    isGenerating,
    isCopied,
    isModalOpen,
    setIsModalOpen,
    generateShareLink,
    copyToClipboard,
    revokeLink,
  };
}
