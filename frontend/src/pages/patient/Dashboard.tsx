import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { recordService } from '../../services/recordService';
import { reminderService } from '../../services/reminderService';
import { sharingService } from '../../services/sharingService';
import { supportService } from '../../services/supportService';
import { MedicalRecord, TodayDose, SharingPermission, CreatedShareResult } from '../../types';
import { HealthSummaryCard } from '../../components/dashboard/HealthSummaryCard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { RecentUploadsCard } from '../../components/dashboard/RecentUploadsCard';
import { UpcomingDosesCard } from '../../components/dashboard/UpcomingDosesCard';
import { RecordUploadModal } from '../../components/records/RecordUploadModal';
import { RecordViewerModal } from '../../components/records/RecordViewerModal';
import { AddReminderModal } from '../../components/reminders/AddReminderModal';
import { CreateShareModal } from '../../components/sharing/CreateShareModal';
import { ShareQrModal } from '../../components/sharing/ShareQrModal';
import { TicketCreateModal } from '../../components/support/TicketCreateModal';
import { useNotification } from '../../contexts/NotificationContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [activeShares, setActiveShares] = useState<SharingPermission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [shareResult, setShareResult] = useState<CreatedShareResult | null>(null);

  const loadDashboardData = async () => {
    try {
      const [recs, todayDoses, shares] = await Promise.all([
        recordService.getRecords(),
        reminderService.getTodayDoses(),
        sharingService.getActiveShares(),
      ]);
      setRecords(recs);
      setDoses(todayDoses);
      setActiveShares(shares.filter((s) => s.is_active));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUploadRecord = async (formData: FormData) => {
    await recordService.uploadRecord(formData);
    showToast('success', 'Document Uploaded', 'Record stored and processed via OCR.');
    loadDashboardData();
  };

  const handleAddReminder = async (data: any) => {
    await reminderService.createReminder(data);
    showToast('success', 'Reminder Scheduled', 'Medicine added to your daily schedule.');
    loadDashboardData();
  };

  const handleTakeDose = async (dose: TodayDose) => {
    try {
      await reminderService.recordDose(dose.reminder_id, {
        status: 'taken',
        scheduled_datetime: dose.scheduled_datetime,
      });
      showToast('success', 'Dose Marked Taken', `Recorded for ${dose.medicine_name}.`);
      loadDashboardData();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to update dose status.');
    }
  };

  const handleSkipDose = async (dose: TodayDose) => {
    try {
      await reminderService.recordDose(dose.reminder_id, {
        status: 'skipped',
        scheduled_datetime: dose.scheduled_datetime,
      });
      showToast('info', 'Dose Skipped', `Marked skipped for ${dose.medicine_name}.`);
      loadDashboardData();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to update dose status.');
    }
  };

  const handleCreateTicket = async (data: any) => {
    const res = await supportService.createTicket(data);
    showToast('success', 'Ticket Submitted', `Ticket #${res.ticket.ticket_number} created.`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-health-700 to-teal-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
            Patient Portal
          </span>
          <h2 className="text-2xl font-bold mt-2">
            Welcome back, {user?.profile?.full_name || 'Patient'}
          </h2>
          <p className="text-xs text-teal-100 max-w-xl mt-1 leading-relaxed">
            Your personal digital locker is active. Manage your clinical records, track upcoming medicine doses,
            and create doctor sharing sessions on your terms.
          </p>
        </div>
        <div className="absolute -right-6 -bottom-8 w-48 h-48 bg-white/5 rounded-full pointer-events-none blur-xl" />
      </div>

      {/* KPI Cards */}
      <HealthSummaryCard
        totalRecords={records.length}
        activeReminders={doses.length}
        activeShares={activeShares.length}
      />

      {/* Quick Action Buttons */}
      <QuickActions
        onUploadClick={() => setIsUploadOpen(true)}
        onAddReminderClick={() => setIsAddReminderOpen(true)}
        onShareClick={() => setIsShareOpen(true)}
        onHelpClick={() => setIsHelpOpen(true)}
      />

      {/* Main 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentUploadsCard
          records={records}
          onViewRecord={(rec) => setSelectedRecord(rec)}
          onViewAllClick={() => navigate('/records')}
        />

        <UpcomingDosesCard
          doses={doses}
          onTakeDose={handleTakeDose}
          onSkipDose={handleSkipDose}
          onViewAllClick={() => navigate('/reminders')}
        />
      </div>

      {/* Modals */}
      <RecordUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUploadRecord}
      />

      <AddReminderModal
        isOpen={isAddReminderOpen}
        onClose={() => setIsAddReminderOpen(false)}
        onAddReminder={handleAddReminder}
      />

      <CreateShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        records={records}
        onCreateShare={sharingService.createShare}
        onSuccess={(result) => setShareResult(result)}
      />

      <ShareQrModal
        isOpen={!!shareResult}
        onClose={() => setShareResult(null)}
        shareResult={shareResult}
      />

      <RecordViewerModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onRecordUpdated={loadDashboardData}
      />

      <TicketCreateModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onSubmitTicket={handleCreateTicket}
      />
    </div>
  );
};
