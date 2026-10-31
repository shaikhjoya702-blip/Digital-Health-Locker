import React, { useState, useEffect } from 'react';
import { SupportTicket, TicketCategory } from '../../types';
import { supportService } from '../../services/supportService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TicketCreateModal } from '../../components/support/TicketCreateModal';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  HelpCircle, 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Send
} from 'lucide-react';

export const SupportDesk: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [loading, setLoading] = useState(true);

  const { showToast } = useNotification();

  const loadTickets = async () => {
    try {
      const data = await supportService.getUserTickets();
      setTickets(data);
      if (selectedTicket) {
        const refreshed = data.find((t) => t.ticket_number === selectedTicket.ticket_number);
        if (refreshed) setSelectedTicket(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (data: any) => {
    const res = await supportService.createTicket(data);
    showToast('success', 'Ticket Submitted', `Ticket #${res.ticket.ticket_number} created.`);
    loadTickets();
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      await supportService.replyToTicket(selectedTicket.ticket_number, replyMessage);
      setReplyMessage('');
      showToast('success', 'Reply Sent', 'Your message has been appended.');
      loadTickets();
    } catch (err) {
      showToast('error', 'Error', 'Failed to send reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning">Open</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'closed':
        return <Badge variant="neutral">Closed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Help & Support Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit inquiries, track issue resolution, and contact our team (xoya0102@gmail.com).
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Submit Support Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
            Your Support Requests ({tickets.length})
          </h3>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading requests...</p>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <HelpCircle className="w-8 h-8 stroke-1 mx-auto text-slate-300 mb-2" />
              No support tickets submitted yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedTicket?.id === t.id
                      ? 'border-health-600 bg-health-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      #{t.ticket_number}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 truncate">{t.subject}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 capitalize">
                    Category: {t.category.replace('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ticket Conversation Thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[460px]">
          {selectedTicket ? (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-health-700">
                    Ticket #{selectedTicket.ticket_number}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: <span className="capitalize">{selectedTicket.category.replace('_', ' ')}</span> • Submitted on{' '}
                  {new Date(selectedTicket.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Original Ticket Description */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-700 mb-1">Original Issue Description:</p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Message responses thread */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  selectedTicket.responses.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-xl border text-xs ${
                        r.is_staff
                          ? 'bg-teal-50/60 border-teal-200 ml-6'
                          : 'bg-white border-slate-200 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">
                          {r.is_staff ? 'Support Staff (xoya0102@gmail.com)' : 'You'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-3">
                    No replies recorded yet. Support notifications are routed to xoya0102@gmail.com.
                  </p>
                )}
              </div>

              {/* Reply box */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your follow-up reply..."
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
                />
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={submittingReply}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Reply
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-16">
              <MessageSquare className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">Select a Ticket</h4>
              <p className="text-xs text-slate-500 mt-1">
                Choose a ticket from the left panel to inspect its status and replies.
              </p>
            </div>
          )}
        </div>
      </div>

      <TicketCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmitTicket={handleCreateTicket}
      />
    </div>
  );
};
