import React from 'react';
import { SharingPermission } from '../../types';
import { Badge } from '../common/Badge';
import { QrCode, Ban, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface ActiveSharesTableProps {
  shares: SharingPermission[];
  onRevoke: (permissionId: string) => Promise<void>;
  onViewQr: (share: SharingPermission) => void;
  loadingId?: string | null;
}

export const ActiveSharesTable: React.FC<ActiveSharesTableProps> = ({
  shares,
  onRevoke,
  onViewQr,
  loadingId,
}) => {
  const getStatusBadge = (share: SharingPermission) => {
    if (share.is_revoked) {
      return <Badge variant="danger">Revoked</Badge>;
    }
    const isExpired = new Date(share.expires_at) < new Date();
    if (isExpired) {
      return <Badge variant="neutral">Expired</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  if (shares.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
        <QrCode className="w-10 h-10 stroke-1 mx-auto text-slate-300 mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">No Sharing Sessions Found</h4>
        <p className="text-xs text-slate-500 mt-1">
          When you generate QR codes or OTPs for doctors, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Sharing Permissions & Audit</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active, expired, and revoked doctor access authorizations.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3.5">Doctor / Clinic</th>
              <th className="px-6 py-3.5">Authorized Records</th>
              <th className="px-6 py-3.5">Expires At</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {shares.map((share) => {
              const isExpired = new Date(share.expires_at) < new Date();
              const canRevoke = !share.is_revoked && !isExpired;

              return (
                <tr key={share.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {share.recipient_label || 'General Medical Consultation'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {share.records && share.records.length > 0 ? (
                      <span title={share.records.map((r) => r.title).join(', ')}>
                        {share.records.length} document(s)
                      </span>
                    ) : (
                      `${share.allowed_record_ids.length} document(s)`
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(share.expires_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(share)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canRevoke && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Ban className="w-3.5 h-3.5" />}
                          onClick={() => onRevoke(share.id)}
                          loading={loadingId === share.id}
                        >
                          Revoke Access
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
