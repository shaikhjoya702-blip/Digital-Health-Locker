import React from 'react';
import { MedicalRecord } from '../../types';
import { FileText, Sparkles, Eye, ArrowUpRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface RecentUploadsCardProps {
  records: MedicalRecord[];
  onViewRecord: (record: MedicalRecord) => void;
  onViewAllClick: () => void;
}

export const RecentUploadsCard: React.FC<RecentUploadsCardProps> = ({
  records,
  onViewRecord,
  onViewAllClick,
}) => {
  const getCategoryBadge = (cat: MedicalRecord['category']) => {
    switch (cat) {
      case 'blood_test':
        return <Badge variant="danger">Blood Test</Badge>;
      case 'prescription':
        return <Badge variant="info">Prescription</Badge>;
      case 'radiology':
        return <Badge variant="warning">Radiology</Badge>;
      case 'discharge_summary':
        return <Badge variant="primary">Discharge</Badge>;
      default:
        return <Badge variant="neutral">Document</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-900">Recent Medical Records</h3>
        </div>
        <button
          onClick={onViewAllClick}
          className="text-xs font-semibold text-health-600 hover:text-health-700 transition-colors"
        >
          View Library →
        </button>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
          <FileText className="w-8 h-8 stroke-1 text-slate-300 mb-2" />
          <p className="text-sm">No medical records uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
          {records.slice(0, 5).map((rec) => (
            <div
              key={rec.id}
              onClick={() => onViewRecord(rec)}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-health-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-health-700 transition-colors">
                    {rec.title}
                  </h4>
                  {getCategoryBadge(rec.category)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{rec.record_date}</span>
                  <span>•</span>
                  <span>{(rec.file_size_bytes / 1024).toFixed(0)} KB</span>
                  {rec.has_ai_summary && (
                    <span className="flex items-center gap-1 text-teal-600 font-medium">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      AI Summary Ready
                    </span>
                  )}
                </div>
              </div>

              <div className="text-slate-400 group-hover:text-health-600 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
