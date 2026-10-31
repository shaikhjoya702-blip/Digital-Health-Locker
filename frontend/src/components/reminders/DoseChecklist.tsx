import React from 'react';
import { TodayDose } from '../../types';
import { Check, X, Clock, Pill } from 'lucide-react';
import { Badge } from '../common/Badge';

interface DoseChecklistProps {
  doses: TodayDose[];
  onTakeDose: (dose: TodayDose) => void;
  onSkipDose: (dose: TodayDose) => void;
}

export const DoseChecklist: React.FC<DoseChecklistProps> = ({
  doses,
  onTakeDose,
  onSkipDose,
}) => {
  const getBadge = (status: TodayDose['status']) => {
    switch (status) {
      case 'taken':
        return <Badge variant="success">Taken</Badge>;
      case 'skipped':
        return <Badge variant="neutral">Skipped</Badge>;
      case 'missed':
        return <Badge variant="danger">Missed</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  if (doses.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
        <Pill className="w-10 h-10 stroke-1 mx-auto text-slate-300 mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">No Reminders Scheduled for Today</h4>
        <p className="text-xs text-slate-500 mt-1">Add medication reminders to track scheduled daily doses.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Today's Dose Checklist</h3>
          <p className="text-xs text-slate-500 mt-0.5">Mark your medication as taken or skipped.</p>
        </div>
      </div>

      <div className="space-y-3">
        {doses.map((dose, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              dose.status === 'taken'
                ? 'bg-emerald-50/30 border-emerald-200'
                : dose.status === 'missed'
                ? 'bg-rose-50/20 border-rose-200'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{dose.medicine_name}</h4>
                {getBadge(dose.status)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                <span className="font-semibold text-slate-700">{dose.dosage}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Scheduled: {dose.scheduled_time}
                </span>
                {dose.meal_instruction !== 'anytime' && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{dose.meal_instruction.replace('_', ' ')}</span>
                  </>
                )}
                {dose.notes && (
                  <>
                    <span>•</span>
                    <span className="italic text-slate-600">"{dose.notes}"</span>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {dose.status !== 'taken' && (
                <button
                  onClick={() => onTakeDose(dose)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Taken
                </button>
              )}
              {dose.status !== 'skipped' && (
                <button
                  onClick={() => onSkipDose(dose)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Skip
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
