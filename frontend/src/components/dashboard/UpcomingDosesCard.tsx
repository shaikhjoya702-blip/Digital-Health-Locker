import React from 'react';
import { TodayDose } from '../../types';
import { Clock, Check, X, Pill } from 'lucide-react';
import { Badge } from '../common/Badge';

interface UpcomingDosesCardProps {
  doses: TodayDose[];
  onTakeDose: (dose: TodayDose) => void;
  onSkipDose: (dose: TodayDose) => void;
  onViewAllClick: () => void;
}

export const UpcomingDosesCard: React.FC<UpcomingDosesCardProps> = ({
  doses,
  onTakeDose,
  onSkipDose,
  onViewAllClick,
}) => {
  const getStatusBadge = (status: TodayDose['status']) => {
    switch (status) {
      case 'taken':
        return <Badge variant="success">Taken</Badge>;
      case 'skipped':
        return <Badge variant="neutral">Skipped</Badge>;
      case 'missed':
        return <Badge variant="danger">Missed</Badge>;
      default:
        return <Badge variant="warning">Upcoming</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Today's Medication</h3>
        </div>
        <button
          onClick={onViewAllClick}
          className="text-xs font-semibold text-health-600 hover:text-health-700 transition-colors"
        >
          View Schedule →
        </button>
      </div>

      {doses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400">
          <Pill className="w-8 h-8 stroke-1 text-slate-300 mb-2" />
          <p className="text-sm">No scheduled doses for today.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
          {doses.map((dose, index) => (
            <div
              key={index}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                dose.status === 'taken'
                  ? 'bg-slate-50/70 border-slate-200 opacity-70'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                    {dose.medicine_name}
                  </h4>
                  {getStatusBadge(dose.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-medium text-slate-700">{dose.dosage}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {dose.scheduled_time}
                  </span>
                  {dose.meal_instruction !== 'anytime' && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{dose.meal_instruction.replace('_', ' ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons if dose is pending or missed */}
              {dose.status !== 'taken' && dose.status !== 'skipped' && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onTakeDose(dose)}
                    title="Mark Taken"
                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSkipDose(dose)}
                    title="Skip Dose"
                    className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
