import { api } from './api';
import { MedicineReminder, TodayDose, DoseHistoryLog } from '../types';

export const reminderService = {
  async getReminders(status?: string) {
    const res = await api.get('/reminders', { params: { status } });
    return res.data.reminders as MedicineReminder[];
  },

  async getTodayDoses() {
    const res = await api.get('/reminders/today');
    return res.data.doses as TodayDose[];
  },

  async createReminder(data: {
    medicine_name: string;
    dosage: string;
    frequency: string;
    scheduled_times: string[];
    start_date: string;
    end_date?: string | null;
    meal_instruction: string;
    notes?: string;
  }) {
    const res = await api.post('/reminders', data);
    return res.data.reminder as MedicineReminder;
  },

  async updateReminder(id: string, data: Partial<MedicineReminder>) {
    const res = await api.put(`/reminders/${id}`, data);
    return res.data.reminder as MedicineReminder;
  },

  async toggleStatus(id: string, status: 'active' | 'paused' | 'completed') {
    const res = await api.patch(`/reminders/${id}/status`, { status });
    return res.data.reminder as MedicineReminder;
  },

  async deleteReminder(id: string) {
    const res = await api.delete(`/reminders/${id}`);
    return res.data;
  },

  async recordDose(reminderId: string, data: { status: 'taken' | 'skipped'; scheduled_datetime: string; note?: string }) {
    const res = await api.post(`/reminders/${reminderId}/doses`, data);
    return res.data;
  },

  async getDoseHistory() {
    const res = await api.get('/reminders/history');
    return res.data.history as DoseHistoryLog[];
  },
};
