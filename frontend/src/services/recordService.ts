import { api } from './api';
import { MedicalRecord } from '../types';

export const recordService = {
  async getRecords(params?: { category?: string; search?: string; start_date?: string; end_date?: string }) {
    const res = await api.get('/records', { params });
    return res.data.records as MedicalRecord[];
  },

  async getRecord(id: string) {
    const res = await api.get(`/records/${id}`);
    return res.data.record as MedicalRecord;
  },

  async uploadRecord(formData: FormData) {
    const res = await api.post('/records', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.record as MedicalRecord;
  },

  async updateRecord(id: string, data: { title?: string; category?: string; notes?: string; record_date?: string }) {
    const res = await api.put(`/records/${id}`, data);
    return res.data.record as MedicalRecord;
  },

  async deleteRecord(id: string) {
    const res = await api.delete(`/records/${id}`);
    return res.data;
  },

  async retryOcr(id: string) {
    const res = await api.post(`/records/${id}/retry-ocr`);
    return res.data;
  },

  getFileUrl(recordId: string) {
    const token = localStorage.getItem('dhl_auth_token');
    return `/api/records/${recordId}/file?auth=${token || ''}`;
  },
};
