import React from 'react';
import { FileText, Pill, Share2, ShieldCheck } from 'lucide-react';

interface HealthSummaryCardProps {
  totalRecords: number;
  activeReminders: number;
  activeShares: number;
}

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({
  totalRecords,
  activeReminders,
  activeShares,
}) => {
  const cards = [
    {
      label: 'Medical Records',
      value: totalRecords,
      icon: <FileText className="w-5 h-5 text-teal-600" />,
      bg: 'bg-teal-50',
      border: 'border-teal-100',
    },
    {
      label: 'Active Reminders',
      value: activeReminders,
      icon: <Pill className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: 'Doctor Shares',
      value: activeShares,
      icon: <Share2 className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Security Status',
      value: 'Protected',
      icon: <ShieldCheck className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50',
      border: 'border-sky-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-2xl bg-white border ${card.border} shadow-sm flex items-center gap-4 transition-all hover:shadow-md`}
        >
          <div className={`p-3 rounded-xl ${card.bg}`}>{card.icon}</div>
          <div>
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};
