import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { MealInstruction, ReminderFrequency } from '../../types';
import { Plus, Trash2, Clock, AlertCircle } from 'lucide-react';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReminder: (data: any) => Promise<void>;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  onAddReminder,
}) => {
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['08:00']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [mealInstruction, setMealInstruction] = useState<MealInstruction>('anytime');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddTime = () => {
    if (scheduledTimes.length < 6) {
      setScheduledTimes([...scheduledTimes, '12:00']);
    }
  };

  const handleRemoveTime = (index: number) => {
    if (scheduledTimes.length > 1) {
      setScheduledTimes(scheduledTimes.filter((_, i) => i !== index));
    }
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...scheduledTimes];
    updated[index] = val;
    setScheduledTimes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName || !dosage || scheduledTimes.length === 0) {
      setError('Medicine name, dosage, and scheduled times are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAddReminder({
        medicine_name: medicineName,
        dosage,
        frequency,
        scheduled_times: scheduledTimes,
        start_date: startDate,
        end_date: endDate || null,
        meal_instruction: mealInstruction,
        notes,
      });
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule reminder.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMedicineName('');
    setDosage('');
    setFrequency('daily');
    setScheduledTimes(['08:00']);
    setNotes('');
    setEndDate('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Medicine Reminder" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Medicine Name"
          value={medicineName}
          onChange={(e) => setMedicineName(e.target.value)}
          placeholder="e.g. Amoxicillin, Metformin, Lisinopril"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prescribed Dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 500 mg, 1 Tablet, 5 ml"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="thrice_daily">Thrice Daily</option>
              <option value="weekly">Weekly</option>
              <option value="as_needed">As Needed (PRN)</option>
            </select>
          </div>
        </div>

        {/* Scheduled times picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Scheduled Times</label>
            <button
              type="button"
              onClick={handleAddTime}
              className="text-xs font-semibold text-health-600 hover:text-health-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Time
            </button>
          </div>
          <div className="space-y-2">
            {scheduledTimes.map((timeVal, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="time"
                    value={timeVal}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
                    required
                  />
                </div>
                {scheduledTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Meal instruction */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Meal Instruction</label>
            <select
              value={mealInstruction}
              onChange={(e) => setMealInstruction(e.target.value as MealInstruction)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
            >
              <option value="anytime">Anytime / None</option>
              <option value="before_meal">Before Meal</option>
              <option value="after_meal">After Meal</option>
              <option value="with_meal">With Meal / Food</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
              required
            />
          </div>
        </div>

        <Input
          label="End Date (Optional)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          helperText="Leave empty for ongoing medications."
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Personal Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Prescribed by Dr. Adams for blood pressure control..."
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Reminder
          </Button>
        </div>
      </form>
    </Modal>
  );
};
