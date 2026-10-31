import { api } from './api';
import { SupportTicket, TicketCategory } from '../types';

export const supportService = {
  async createTicket(data: {
    subject: string;
    description: string;
    category: TicketCategory;
    contact_email?: string;
  }) {
    const res = await api.post('/support/tickets', data);
    return res.data;
  },

  async getUserTickets() {
    const res = await api.get('/support/tickets');
    return res.data.tickets as SupportTicket[];
  },

  async getTicket(ticketNumber: string) {
    const res = await api.get(`/support/tickets/${ticketNumber}`);
    return res.data.ticket as SupportTicket;
  },

  async replyToTicket(ticketNumber: string, message: string, responder_email?: string) {
    const res = await api.post(`/support/tickets/${ticketNumber}/reply`, {
      message,
      responder_email,
    });
    return res.data;
  },
};
