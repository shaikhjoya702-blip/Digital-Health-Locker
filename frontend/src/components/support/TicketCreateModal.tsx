import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TicketCategory } from '../../types';
import { HelpCircle, AlertCircle, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TicketCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitTicket: (data: {
    subject: string;
    description: string;
    category: TicketCategory;
    contact_email?: string;
  }) => Promise<any>;
}

export const TicketCreateModal: React.FC<TicketCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmitTicket,
}) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      setError('Subject and description are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmitTicket({
        subject,
        description,
        category,
        contact_email: contactEmail || user?.email,
      });
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit support ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setDescription('');
    setCategory('general');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit Support Ticket" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          Our support desk is routed to designated technical support (<strong>xoya0102@gmail.com</strong>).
          Please do not include passwords or sensitive personal health details in support tickets.
        </div>

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your question or issue"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
            >
              <option value="general">General Assistance</option>
              <option value="login_issues">Login / Sign In</option>
              <option value="password_recovery">Password Recovery</option>
              <option value="report_upload">Report Upload / OCR</option>
              <option value="qr_sharing">QR / OTP Sharing</option>
              <option value="medicine_reminders">Medicine Reminders</option>
            </select>
          </div>

          <Input
            label="Contact Email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Please describe what you are experiencing in detail..."
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} icon={<Send className="w-4 h-4" />}>
            Submit Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
};
