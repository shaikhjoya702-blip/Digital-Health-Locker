import React, { useState, useEffect } from 'react';
import { SharingPermission, CreatedShareResult, MedicalRecord } from '../../types';
import { sharingService } from '../../services/sharingService';
import { recordService } from '../../services/recordService';
import { Button } from '../../components/common/Button';
import { ActiveSharesTable } from '../../components/sharing/ActiveSharesTable';
import { CreateShareModal } from '../../components/sharing/CreateShareModal';
import { ShareQrModal } from '../../components/sharing/ShareQrModal';
import { useNotification } from '../../contexts/NotificationContext';
import { QrCode, ShieldCheck, KeyRound, Clock, Plus, Ban, CheckCircle2 } from 'lucide-react';

export const SharingStudio: React.FC = () => {
  const [shares, setShares] = useState<SharingPermission[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [shareResult, setShareResult] = useState<CreatedShareResult | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useNotification();

  const loadSharesAndRecords = async () => {
    try {
      const [sharesData, recordsData] = await Promise.all([
        sharingService.getActiveShares(),
        recordService.getRecords(),
      ]);
      setShares(sharesData);
      setRecords(recordsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharesAndRecords();
  }, []);

  const handleRevoke = async (permissionId: string) => {
    if (!window.confirm('Revoke access immediately? The doctor will lose all visibility.')) {
      return;
    }

    setRevokingId(permissionId);
    try {
      await sharingService.revokeShare(permissionId);
      showToast('success', 'Access Revoked', 'Doctor session invalidated immediately.');
      loadSharesAndRecords();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to revoke sharing session.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">QR & OTP Sharing Studio</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share authorized clinical reports with doctors using time-limited QR codes or OTP verification.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
          disabled={records.length === 0}
        >
          Create Doctor Share Link
        </Button>
      </div>

      {/* Security Architecture Explainer Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Opaque QR URL</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              QR contains an unpredictable random token only. No patient data or DB queries are exposed.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Salted OTP Challenge</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Doctor enters 6-digit OTP. Hashed in MySQL; locks automatically after 5 failed attempts.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Instant Revocation</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cancel access anytime. Expired or revoked permissions immediately deny document reads.
            </p>
          </div>
        </div>
      </div>

      {/* Active Shares Table */}
      <ActiveSharesTable
        shares={shares}
        onRevoke={handleRevoke}
        onViewQr={() => {}}
        loadingId={revokingId}
      />

      {/* Create Share Modal */}
      <CreateShareModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        records={records}
        onCreateShare={sharingService.createShare}
        onSuccess={(result) => {
          setShareResult(result);
          loadSharesAndRecords();
        }}
      />

      {/* Show Generated QR & OTP Modal */}
      <ShareQrModal
        isOpen={!!shareResult}
        onClose={() => setShareResult(null)}
        shareResult={shareResult}
      />
    </div>
  );
};
