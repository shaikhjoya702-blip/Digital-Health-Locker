import { api } from './api';
import { AiSummary } from '../types';

export const aiService = {
  async generateSummary(recordId: string) {
    const res = await api.post(`/ai/summarize/${recordId}`);
    return res.data as { summary: AiSummary; is_simulated: boolean; disclaimer: string };
  },

  async getSummary(recordId: string) {
    const res = await api.get(`/ai/summarize/${recordId}`);
    return res.data.summary as AiSummary;
  },
};
