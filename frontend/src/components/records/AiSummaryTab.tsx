import React from 'react';
import { AiSummary, MedicalRecord } from '../../types';
import { 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Activity, 
  HeartPulse, 
  Compass,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '../common/Button';

interface AiSummaryTabProps {
  record: MedicalRecord;
  onGenerateSummary: () => Promise<void>;
  isGenerating: boolean;
}

export const AiSummaryTab: React.FC<AiSummaryTabProps> = ({
  record,
  onGenerateSummary,
  isGenerating,
}) => {
  const summary = record.ai_summary;

  if (!summary) {
    return (
      <div className="py-14 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-bold text-slate-900">Personalized Health Insights & Summary</h4>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Translate this report's clinical data into plain English with a holistic AI health perspective, 
          structured biomarker readings, and thoughtful questions for your next doctor's visit.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={onGenerateSummary}
            loading={isGenerating}
          >
            Generate Clinical Summary & Perspective
          </Button>
        </div>
      </div>
    );
  }

  // Interpret badge styling for the overall status
  const getStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('optimal') || s.includes('normal')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {status || 'Optimal / Normal Limits'}
        </span>
      );
    }
    if (s.includes('mild') || s.includes('borderline') || s.includes('stable')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Activity className="w-3.5 h-3.5 text-amber-600" />
          {status || 'Stable / Minor Variations'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
        <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
        {status || 'Physician Review Suggested'}
      </span>
    );
  };

  const getInterpretationBadge = (interp?: string) => {
    const i = (interp || '').toLowerCase();
    if (i.includes('normal') || i.includes('optimal')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Normal</span>;
    }
    if (i.includes('high') || i.includes('elevated')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Elevated</span>;
    }
    if (i.includes('low') || i.includes('below')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Below Target</span>;
    }
    if (i.includes('borderline')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">Borderline</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">{interp || 'Reported'}</span>;
  };

  return (
    <div className="space-y-6 select-text">
      {/* 1. Humanized Overview Header Card */}
      <div className="bg-gradient-to-br from-teal-50/70 via-white to-slate-50 p-5 rounded-2xl border border-teal-100/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                Clinical Health Summary
              </h3>
              <p className="text-[11px] text-slate-500">
                Grounded analysis for {record.title}
              </p>
            </div>
          </div>
          {getStatusBadge(summary.overall_status)}
        </div>

        {/* Narrative Paragraph */}
        <p className="text-sm text-slate-700 leading-relaxed pt-1">
          {summary.summary_text}
        </p>
      </div>

      {/* 2. AI Clinical Perspective Section (Requested by User) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 rounded-2xl p-5 shadow-sm border border-slate-700/60">
        <div className="flex items-center gap-2.5 mb-3 text-teal-400">
          <Compass className="w-5 h-5 flex-shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
            AI Clinical Perspective & Holistic Interpretation
          </h4>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
          {summary.ai_perspective || (
            "This report reflects a collection of specialized physiological indicators. Biomarkers interact dynamically with daily factors such as hydration, circadian cycles, recent nutritional intake, and physical conditioning. Rather than viewing any single measurement in isolation, clinical value comes from looking at overall trends alongside your personal health history."
          )}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Empathetic Clinical Synthesis Engine
          </span>
          <span>Model: {summary.model_name}</span>
        </div>
      </div>

      {/* 3. Structured Biomarkers & Test Observations */}
      {summary.key_findings && summary.key_findings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Observed Biomarkers & Values ({summary.key_findings.length})
            </h4>
            <span className="text-[11px] text-slate-400">Verified against reference intervals</span>
          </div>

          <div className="overflow-hidden border border-slate-200/90 rounded-2xl shadow-sm bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="px-4 py-3">Biomarker / Test</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Standard Reference</th>
                  <th className="px-4 py-3 text-right">Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.key_findings.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{item.parameter}</span>
                      {item.significance && (
                        <span className="text-[11px] text-slate-500 font-normal mt-0.5 block">
                          {item.significance}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      {item.observed_value}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {item.reference_range || 'Not Specified'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {getInterpretationBadge(item.interpretation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Questions to Bring to Your Doctor */}
      {summary.questions_for_doctor && summary.questions_for_doctor.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-teal-700">
            <MessageSquare className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Questions to Discuss With Your Doctor
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Take these suggested questions to your next appointment to make the most of your conversation:
          </p>
          <ul className="space-y-2 mt-2">
            {summary.questions_for_doctor.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <ArrowUpRight className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Incomplete / Ambiguous Data Notice if any */}
      {summary.missing_or_unclear_info && summary.missing_or_unclear_info !== 'None' && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-700">Legibility / Scope Notice: </span>
            <span className="text-slate-600">{summary.missing_or_unclear_info}</span>
          </div>
        </div>
      )}

      {/* 6. Humanized Medical Disclaimer & Actions Footer */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-500">
          <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>Designed for patient empowerment & shared decision making with your physician.</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />}
          onClick={onGenerateSummary}
          loading={isGenerating}
        >
          Update Analysis
        </Button>
      </div>
    </div>
  );
};
