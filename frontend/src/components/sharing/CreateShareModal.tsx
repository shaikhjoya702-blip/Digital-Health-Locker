import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { MedicalRecord, CreatedShareResult } from '../../types';
import { ShieldCheck, Clock, FileText, AlertCircle, Sparkles, Download } from 'lucide-react';

interface CreateShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: MedicalRecord[];
  onCreateShare: (data: {
    record_ids: string[];
    duration_hours: number;
    recipient_label: string;
    allow_download: boolean;
    include_ai_summary: boolean;
  }) => Promise<CreatedShareResult>;
  onSuccess: (result: CreatedShareResult) => void;
}

export const CreateShareModal: React.FC<CreateShareModalProps> = ({
  isOpen,
  onClose,
  records,
  onCreateShare,
  onSuccess,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [recipientLabel, setRecipientLabel] = useState<string>('');
  const [allowDownload, setAllowDownload] = useState<boolean>(false);
  const [includeAiSummary, setIncludeAiSummary] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const toggleRecord = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Please select at least one medical record to share.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await onCreateShare({
        record_ids: selectedIds,
        duration_hours: Number(durationHours),
        recipient_label: recipientLabel.trim(),
        allow_download: allowDownload,
        include_ai_summary: includeAiSummary,
      });
      handleClose();
      onSuccess(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sharing session.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setDurationHours(1);
    setRecipientLabel('');
    setAllowDownload(false);
    setIncludeAiSummary(true);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share Records with Healthcare Professional" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900 leading-relaxed">
            <span className="font-semibold">Patient Privacy Guarantee: </span>
            The recipient will only gain temporary access to the specific records you check below.
            No unrestricted account access or database credentials are ever shared.
          </div>
        </div>

        <Input
          label="Doctor or Clinic Name / Purpose (Optional)"
          value={recipientLabel}
          onChange={(e) => setRecipientLabel(e.target.value)}
          placeholder="e.g. Dr. Jennifer Smith — Cardiology Consultation"
        />

        {/* Access Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> Access Duration
          </label>
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
          >
            <option value={0.25}>15 Minutes (Brief in-clinic review)</option>
            <option value={1}>1 Hour (Standard consultation)</option>
            <option value={6}>6 Hours (Same-day hospital visit)</option>
            <option value={24}>24 Hours (Full-day medical evaluation)</option>
            <option value={168}>7 Days (Weekly specialist review)</option>
          </select>
        </div>

        {/* Granular Permission Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={includeAiSummary}
              onChange={(e) => setIncludeAiSummary(e.target.checked)}
              className="w-4 h-4 text-health-600 rounded border-slate-300 focus:ring-health-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Include AI Summaries
              </span>
              <p className="text-[11px] text-slate-500">Allow doctor to view structured key findings.</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="w-4 h-4 text-health-600 rounded border-slate-300 focus:ring-health-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-slate-600" /> Allow File Download
              </span>
              <p className="text-[11px] text-slate-500">If unchecked, viewing is strictly read-only inline.</p>
            </div>
          </label>
        </div>

        {/* Record Selection Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Select Reports to Authorize ({selectedIds.length} of {records.length})
            </label>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-health-600 hover:text-health-700"
            >
              {selectedIds.length === records.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {records.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">No medical records available to share.</p>
            ) : (
              records.map((rec) => {
                const isChecked = selectedIds.includes(rec.id);
                return (
                  <label
                    key={rec.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      isChecked ? 'bg-health-50/50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRecord(rec.id)}
                      className="w-4 h-4 text-health-600 rounded border-slate-300 focus:ring-health-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{rec.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {rec.record_date} • {rec.category.replace('_', ' ')}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} disabled={selectedIds.length === 0}>
            Generate QR & OTP
          </Button>
        </div>
      </form>
    </Modal>
  );
};
