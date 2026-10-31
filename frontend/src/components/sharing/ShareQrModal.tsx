import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CreatedShareResult } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Clock, ShieldCheck, KeyRound } from 'lucide-react';
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
  const { showToast } = useNotification();

  if (!shareResult) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareResult.sharing_url);
    setCopied(true);
    showToast('info', 'Link Copied', 'Secure sharing URL copied to clipboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(shareResult.otp);
    showToast('info', 'OTP Copied', '6-digit verification code copied.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Doctor Sharing Session Created" maxWidth="md">
      <div className="space-y-5 text-center">
        {/* QR Code Container */}
        <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mx-auto">
          <QRCodeSVG
            value={shareResult.sharing_url}
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Required if doctor access policy enforces 2-factor OTP.
          </p>
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

        <div className="flex justify-end gap-3 pt-2">
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
    </Modal>
  );
};
