import React, { useState, useEffect } from 'react';
import { MedicineReminder, TodayDose, DoseHistoryLog } from '../../types';
import { reminderService } from '../../services/reminderService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DoseChecklist } from '../../components/reminders/DoseChecklist';
import { AddReminderModal } from '../../components/reminders/AddReminderModal';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  Pill, 
  Plus, 
  Clock, 
  Pause, 
  Play, 
  Trash2, 
  Bell, 
  CheckCircle2, 
  Calendar,
  History
} from 'lucide-react';

export const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [todayDoses, setTodayDoses] = useState<TodayDose[]>([]);
  const [history, setHistory] = useState<DoseHistoryLog[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'schedules' | 'history'>('today');
  const [loading, setLoading] = useState(true);

  const { showToast, hasBrowserPermission, requestBrowserPermission, sendBrowserNotification } = useNotification();

  const loadData = async () => {
    try {
      const [rems, doses, hist] = await Promise.all([
        reminderService.getReminders(),
        reminderService.getTodayDoses(),
        reminderService.getDoseHistory(),
      ]);
      setReminders(rems);
      setTodayDoses(doses);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddReminder = async (data: any) => {
    await reminderService.createReminder(data);
    showToast('success', 'Reminder Added', 'New schedule saved.');
    loadData();
  };

  const handleTakeDose = async (dose: TodayDose) => {
    try {
      await reminderService.recordDose(dose.reminder_id, {
        status: 'taken',
        scheduled_datetime: dose.scheduled_datetime,
      });
      showToast('success', 'Dose Marked Taken', `Logged for ${dose.medicine_name}`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to update dose.');
    }
  };

  const handleSkipDose = async (dose: TodayDose) => {
    try {
      await reminderService.recordDose(dose.reminder_id, {
        status: 'skipped',
        scheduled_datetime: dose.scheduled_datetime,
      });
      showToast('info', 'Dose Skipped', `Marked skipped for ${dose.medicine_name}`);
      loadData();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to update dose.');
    }
  };

  const handleToggleStatus = async (rem: MedicineReminder) => {
    const nextStatus = rem.status === 'active' ? 'paused' : 'active';
    try {
      await reminderService.toggleStatus(rem.id, nextStatus);
      showToast('info', 'Status Changed', `Schedule set to ${nextStatus}.`);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to change status');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('Delete this medicine schedule and reminder?')) return;
    try {
      await reminderService.deleteReminder(id);
      showToast('success', 'Deleted', 'Schedule removed.');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete reminder.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medicine Reminders & Dose Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your daily dosages, track adherence, and receive timely browser alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasBrowserPermission && (
            <Button
              variant="outline"
              size="md"
              icon={<Bell className="w-4 h-4 text-amber-600" />}
              onClick={requestBrowserPermission}
              className="text-amber-800 border-amber-200 bg-amber-50 hover:bg-amber-100"
            >
              Enable Browser Alerts
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'today'
              ? 'border-health-600 text-health-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Today's Doses ({todayDoses.length})
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'schedules'
              ? 'border-health-600 text-health-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          Active Schedules ({reminders.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-health-600 text-health-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Dose History ({history.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'today' && (
        <DoseChecklist
          doses={todayDoses}
          onTakeDose={handleTakeDose}
          onSkipDose={handleSkipDose}
        />
      )}

      {activeTab === 'schedules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                rem.status === 'paused'
                  ? 'bg-slate-50/70 border-slate-200 opacity-75'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-slate-900">{rem.medicine_name}</h3>
                  <Badge variant={rem.status === 'active' ? 'success' : 'neutral'}>
                    {rem.status}
                  </Badge>
                </div>

                <p className="text-xs font-semibold text-slate-700 mb-2">{rem.dosage}</p>

                <div className="space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Times: {rem.scheduled_times.join(', ')}
                  </p>
                  <p className="capitalize">
                    Meal: {rem.meal_instruction.replace('_', ' ')}
                  </p>
                  <p>Start Date: {rem.start_date}</p>
                  {rem.end_date && <p>End Date: {rem.end_date}</p>}
                  {rem.notes && <p className="italic text-slate-600 mt-2">"{rem.notes}"</p>}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={rem.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  onClick={() => handleToggleStatus(rem)}
                >
                  {rem.status === 'active' ? 'Pause' : 'Resume'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  onClick={() => handleDeleteReminder(rem.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Scheduled Date & Time</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Recorded At</th>
                  <th className="px-6 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No dose records logged yet.
                    </td>
                  </tr>
                ) : (
                  history.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {new Date(log.scheduled_for).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            log.status === 'taken'
                              ? 'success'
                              : log.status === 'skipped'
                              ? 'neutral'
                              : 'danger'
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {log.taken_at ? new Date(log.taken_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{log.note || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      <AddReminderModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddReminder={handleAddReminder}
      />
    </div>
  );
};
