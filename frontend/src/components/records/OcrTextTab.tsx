import React from 'react';
import { DocumentExtraction } from '../../types';
import { Badge } from '../common/Badge';
import { RefreshCw, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../common/Button';

interface OcrTextTabProps {
  extraction?: DocumentExtraction;
  onRetryOcr: () => Promise<void>;
  isRetrying: boolean;
}

export const OcrTextTab: React.FC<OcrTextTabProps> = ({
  extraction,
  onRetryOcr,
  isRetrying,
}) => {
  if (!extraction) {
    return (
      <div className="py-12 text-center text-slate-400">
        <FileText className="w-12 h-12 stroke-1 mx-auto text-slate-300 mb-2" />
        <p className="text-sm">No text extraction data found for this document.</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (extraction.processing_status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'incomplete':
        return <Badge variant="warning">Incomplete</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'processing':
        return <Badge variant="info">Processing...</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">Extraction Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              {getStatusBadge()}
              <span className="text-xs text-slate-500 capitalize">
                Method: {extraction.extraction_method.replace('_', ' ')}
              </span>
              {extraction.confidence_score && (
                <span className="text-xs text-slate-500">
                  • Confidence: {extraction.confidence_score}%
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
          onClick={onRetryOcr}
          loading={isRetrying}
        >
          Re-process OCR
        </Button>
      </div>

      {extraction.error_message && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">OCR Processing Notice</p>
            <p className="mt-0.5">{extraction.error_message}</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Extracted Document Text
        </label>
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[360px] whitespace-pre-wrap leading-relaxed select-text border border-slate-800">
          {extraction.extracted_text || 'No text content extracted from this document.'}
        </div>
      </div>
    </div>
  );
};
