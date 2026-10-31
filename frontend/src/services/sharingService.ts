import { api } from './api';
import { SharingPermission, CreatedShareResult, MedicalRecord } from '../types';

export const sharingService = {
  // Patient endpoints
  async createShare(data: {
    record_ids: string[];
    duration_hours: number;
    recipient_label?: string;
    allow_download?: boolean;
    include_ai_summary?: boolean;
  }) {
    const res = await api.post('/sharing/create', data);
    return res.data.share as CreatedShareResult;
  },

  async getActiveShares() {
    const res = await api.get('/sharing/active');
    return res.data.shares as SharingPermission[];
  },

  async revokeShare(permissionId: string) {
    const res = await api.post(`/sharing/revoke/${permissionId}`);
    return res.data;
  },

  async getShareAudit(permissionId: string) {
    const res = await api.get(`/sharing/audit/${permissionId}`);
    return res.data;
  },

  // Public / Doctor Portal endpoints
  async resolveToken(token: string) {
    const res = await api.post('/public/share/resolve', { token });
    return res.data;
  },

  async verifyDoctorOtp(token: string, otp: string) {
    const res = await api.post('/public/share/verify-otp', { token, otp });
    return res.data as {
      success: boolean;
      doctor_token: string;
      expires_at: string;
      allow_download: boolean;
      include_ai_summary: boolean;
    };
  },

  async getDoctorSharedRecords(doctorToken: string) {
    const res = await api.get('/public/share/records', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    return res.data as {
      patient_alias: string;
      expires_at: string;
      allow_download: boolean;
      include_ai_summary: boolean;
      records: MedicalRecord[];
    };
  },

  async generateDoctorRecordSummary(doctorToken: string, recordId: string) {
    const res = await api.post(`/public/share/records/${recordId}/summary/generate`, {}, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    return res.data;
  },
};
