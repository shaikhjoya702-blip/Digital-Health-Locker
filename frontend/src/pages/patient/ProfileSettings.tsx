import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuditLogItem } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { User, Lock, Shield, History, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotification();

  // Profile Form state
  const [fullName, setFullName] = useState(user?.profile?.full_name || '');
  const [dob, setDob] = useState(user?.profile?.date_of_birth || '');
  const [gender, setGender] = useState(user?.profile?.gender || 'prefer_not_to_say');
  const [bloodGroup, setBloodGroup] = useState(user?.profile?.blood_group || '');
  const [phone, setPhone] = useState(user?.profile?.phone_number || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.profile?.emergency_contact_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    if (user?.profile) {
      setFullName(user.profile.full_name);
      setDob(user.profile.date_of_birth || '');
      setGender(user.profile.gender || 'prefer_not_to_say');
      setBloodGroup(user.profile.blood_group || '');
      setPhone(user.profile.phone_number || '');
      setEmergencyContact(user.profile.emergency_contact_name || '');
    }
    loadAuditLogs();
  }, [user]);

  const loadAuditLogs = async () => {
    try {
      const res = await api.get('/audit');
      setAuditLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/profile', {
        full_name: fullName,
        date_of_birth: dob || null,
        gender,
        blood_group: bloodGroup,
        phone_number: phone,
        emergency_contact_name: emergencyContact,
      });
      await refreshUser();
      showToast('success', 'Profile Updated', 'Your health details have been saved.');
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password Updated', 'Your credentials have been securely changed.');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Profile & Security Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal medical profile, update password, and review account audit logs.
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <User className="w-5 h-5 text-teal-600" />
          <h3 className="text-base font-semibold text-slate-900">Personal Health Profile</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Legal Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer Not to Say</option>
              </select>
            </div>

            <Input
              label="Blood Group"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. O+, A-, B+"
            />

            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />

            <Input
              label="Emergency Contact"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Name & Contact number"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" type="submit" loading={savingProfile}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <Lock className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Change Account Password</h3>
        </div>

        {passwordError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Min 8 chars, uppercase, number & symbol."
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" type="submit" loading={updatingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900">Security & Access Audit Trail</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Entity</th>
                <th className="px-4 py-2.5">IP Address</th>
                <th className="px-4 py-2.5">Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {auditLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{log.action}</td>
                  <td className="px-4 py-2.5 text-slate-500">{log.entity_type}</td>
                  <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{log.ip_address || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
