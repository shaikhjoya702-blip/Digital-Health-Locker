import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CreatedShareResult } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Clock, KeyRound, ExternalLink } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface ShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareResult: CreatedShareResult | null;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  isOpen,
  onClose,
  shareResult,
}) => {
  const [copied, setCopied] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);
  const { showToast } = useNotification();

  // Compute the live browser URL for the doctor portal so it always matches the current host
  const effectiveUrl = useMemo(() => {
    if (!shareResult) return '';
    if (shareResult.token && typeof window !== 'undefined') {
      return `${window.location.origin}/doctor/portal?token=${shareResult.token}`;
    }
    if (
      shareResult.sharing_url &&
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      shareResult.sharing_url.includes('localhost')
    ) {
      try {
        const parsed = new URL(shareResult.sharing_url);
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      } catch {
        return shareResult.sharing_url;
      }
    }
    return shareResult.sharing_url;
  }, [shareResult]);

  if (!shareResult) return null;

  // Robust clipboard copy with fallback for all browser security contexts
  const copyText = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to fallback
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    const success = await copyText(effectiveUrl);
    if (success) {
      setCopied(true);
      showToast('info', 'Link Copied', 'Doctor portal sharing URL copied to clipboard.');
      setTimeout(() => setCopied(false), 2500);
    } else {
      showToast('warning', 'Notice', 'Could not access clipboard automatically. Please copy the link below manually.');
    }
  };

  const handleCopyOtp = async () => {
    const success = await copyText(shareResult.otp);
    if (success) {
      setOtpCopied(true);
      showToast('info', 'OTP Copied', '6-digit verification code copied.');
      setTimeout(() => setOtpCopied(false), 2500);
    } else {
      showToast('warning', 'Notice', 'Please copy the OTP code manually.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Doctor Sharing Session Created" maxWidth="md">
      <div className="space-y-5 text-center">
        {/* QR Code Container */}
        <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mx-auto">
          <QRCodeSVG
            value={effectiveUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* 6-Digit OTP Block */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-teal-600" />
            Verification Code (OTP)
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-widest text-slate-900">
              {shareResult.otp}
            </span>
            <button
              onClick={handleCopyOtp}
              title="Copy OTP"
              type="button"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            >
              {otpCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Required if doctor access policy enforces 2-factor OTP.
          </p>
        </div>

        {/* Direct Link Preview & Copy */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center gap-2 text-left">
          <input
            type="text"
            readOnly
            value={effectiveUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 bg-transparent text-xs text-slate-600 font-mono truncate focus:outline-none select-all"
            title="Click to select full URL"
          />
          <button
            onClick={handleCopyLink}
            type="button"
            className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-1 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Security & Expiry info */}
        <div className="text-xs text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium text-slate-700">
            <Clock className="w-4 h-4 text-amber-500" />
            Expires At: {new Date(shareResult.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(shareResult.expires_at).toLocaleDateString()})
          </p>
          <p>
            Authorized Records: <strong>{shareResult.records_shared_count} document(s)</strong>
          </p>
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-600 bg-teal-50/60 p-3 rounded-xl border border-teal-100 text-left">
          <strong>Doctor Instructions: </strong>
          Your healthcare provider can point their camera at this QR code or navigate to the link and
          enter your 6-digit OTP to view the authorized reports.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-xl border border-teal-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Portal in New Tab
          </a>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyLink}
            >
              {copied ? 'Link Copied' : 'Copy Portal Link'}
            </Button>

            <Button variant="primary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
