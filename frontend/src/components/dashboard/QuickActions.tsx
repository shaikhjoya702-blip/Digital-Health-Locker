import React from 'react';
import { Upload, Plus, QrCode, MessageSquarePlus } from 'lucide-react';
import { Button } from '../common/Button';

interface QuickActionsProps {
  onUploadClick: () => void;
  onAddReminderClick: () => void;
  onShareClick: () => void;
  onHelpClick: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onUploadClick,
  onAddReminderClick,
  onShareClick,
  onHelpClick,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="outline"
          size="md"
          icon={<Upload className="w-4 h-4 text-health-600" />}
          onClick={onUploadClick}
          className="w-full justify-start text-xs font-medium py-3 border-slate-200 hover:border-health-500 hover:bg-health-50"
        >
          Upload Record
        </Button>

        <Button
          variant="outline"
          size="md"
          icon={<Plus className="w-4 h-4 text-indigo-600" />}
          onClick={onAddReminderClick}
          className="w-full justify-start text-xs font-medium py-3 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50"
        >
          Add Reminder
        </Button>

        <Button
          variant="outline"
          size="md"
          icon={<QrCode className="w-4 h-4 text-emerald-600" />}
          onClick={onShareClick}
          className="w-full justify-start text-xs font-medium py-3 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50"
        >
          Share with Doctor
        </Button>

        <Button
          variant="outline"
          size="md"
          icon={<MessageSquarePlus className="w-4 h-4 text-sky-600" />}
          onClick={onHelpClick}
          className="w-full justify-start text-xs font-medium py-3 border-slate-200 hover:border-sky-500 hover:bg-sky-50"
        >
          Need Support?
        </Button>
      </div>
    </div>
  );
};
