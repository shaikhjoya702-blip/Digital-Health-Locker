import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { MedicalRecord } from '../../types';
import { OcrTextTab } from './OcrTextTab';
import { AiSummaryTab } from './AiSummaryTab';
import { FileText, Sparkles, Binary, ExternalLink, Calendar, Tag } from 'lucide-react';
import { recordService } from '../../services/recordService';
import { aiService } from '../../services/aiService';
import { useNotification } from '../../contexts/NotificationContext';

interface RecordViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MedicalRecord | null;
  onRecordUpdated: () => void;
}

export const RecordViewerModal: React.FC<RecordViewerModalProps> = ({
  isOpen,
  onClose,
  record,
  onRecordUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'ocr' | 'ai'>('document');
  const [isRetryingOcr, setIsRetryingOcr] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const { showToast } = useNotification();

  if (!record) return null;

  const fileUrl = recordService.getFileUrl(record.id);

  const handleRetryOcr = async () => {
    setIsRetryingOcr(true);
    try {
      await recordService.retryOcr(record.id);
      showToast('success', 'OCR Updated', 'Document re-processed successfully.');
      onRecordUpdated();
    } catch (err: any) {
      showToast('error', 'OCR Failed', err.response?.data?.error || 'Re-processing failed.');
    } finally {
      setIsRetryingOcr(false);
    }
  };

  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      await aiService.generateSummary(record.id);
      showToast('success', 'Summary Ready', 'AI medical summary generated successfully.');
      onRecordUpdated();
    } catch (err: any) {
      showToast('error', 'AI Summary Failed', err.response?.data?.error || 'Summary generation failed.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={record.title} maxWidth="4xl">
      <div className="space-y-4">
        {/* Record Metadata bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date: <strong className="text-slate-700">{record.record_date}</strong>
            </span>
            <span className="flex items-center gap-1 capitalize">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Category: <strong className="text-slate-700">{record.category.replace('_', ' ')}</strong>
            </span>
          </div>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold"
          >
            Open in new tab <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Tab selection navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('document')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'document'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Original Report File
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'ocr'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Binary className="w-4 h-4" />
            Extracted Text (OCR)
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'ai'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI-Assisted Summary
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="min-h-[420px]">
          {activeTab === 'document' && (
            <div className="w-full h-[540px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
              {(record.mime_type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(record.original_filename)) ? (
                <img
                  src={fileUrl}
                  alt={record.title}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <iframe
                  src={fileUrl}
                  title={record.title}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          )}

          {activeTab === 'ocr' && (
            <OcrTextTab
              extraction={record.extraction}
              onRetryOcr={handleRetryOcr}
              isRetrying={isRetryingOcr}
            />
          )}

          {activeTab === 'ai' && (
            <AiSummaryTab
              record={record}
              onGenerateSummary={handleGenerateAi}
              isGenerating={isGeneratingAi}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
