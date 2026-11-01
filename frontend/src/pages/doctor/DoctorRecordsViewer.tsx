import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharingService } from '../../services/sharingService';
import { API_BASE_URL } from '../../services/api';
import { MedicalRecord } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { 
  Stethoscope, 
  FileText, 
  Download, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  Calendar,
  AlertCircle,
  Compass,
  HeartPulse,
  Activity,
  CheckCircle2,
  MessageSquare,
  ArrowUpRight
} from 'lucide-react';

export const DoctorRecordsViewer: React.FC = () => {
  const navigate = useNavigate();
  const doctorToken = sessionStorage.getItem('dhl_doctor_token');

  const [data, setData] = useState<{
    patient_alias: string;
    expires_at: string;
    allow_download: boolean;
    include_ai_summary: boolean;
    records: MedicalRecord[];
  } | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'document' | 'ai'>('document');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleGenerateDoctorAi = async () => {
    if (!selectedRecord || !doctorToken) return;
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const res = await sharingService.generateDoctorRecordSummary(doctorToken, selectedRecord.id);
      if (res.summary) {
        const updatedRecord = { ...selectedRecord, ai_summary: res.summary };
        setSelectedRecord(updatedRecord);
        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            records: prev.records.map((r) => (r.id === selectedRecord.id ? updatedRecord : r)),
          };
        });
      }
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Failed to generate AI summary.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (!doctorToken) {
      navigate('/doctor/portal');
      return;
    }

    loadSharedRecords();
  }, [doctorToken]);

  const loadSharedRecords = async () => {
    try {
      const res = await sharingService.getDoctorSharedRecords(doctorToken!);
      setData(res);
      if (res.records.length > 0) {
        setSelectedRecord(res.records[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Access expired or was revoked by the patient.');
    } finally {
      setLoading(false);
    }
  };

  // Expiration countdown
  useEffect(() => {
    if (!data?.expires_at) return;

    const timer = setInterval(() => {
      // Ensure date string is parsed as UTC regardless of user device timezone
      const dateStr = data.expires_at;
      const targetTime = dateStr.endsWith('Z') || dateStr.includes('+')
        ? new Date(dateStr).getTime()
        : new Date(dateStr + 'Z').getTime();

      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
        setError('Your consultation access session has expired.');
      } else {
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data]);

  const handleExit = () => {
    sessionStorage.removeItem('dhl_doctor_token');
    navigate('/doctor/portal');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-slate-200 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Session Terminated</h3>
          <p className="text-xs text-slate-500 mt-2 mb-6">{error || 'Session expired or revoked.'}</p>
          <Button variant="primary" onClick={handleExit} className="w-full">
            Exit Portal
          </Button>
        </div>
      </div>
    );
  }

  const fileStreamUrl = selectedRecord
    ? `${API_BASE_URL}/public/share/records/${selectedRecord.id}/view?token=${encodeURIComponent(doctorToken || '')}`
    : '';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Doctor Header bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-md">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {data.patient_alias}
            </h1>
            <p className="text-[11px] text-teal-700 font-semibold">Authorized Clinical Document Viewer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Session: {timeLeft}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={handleExit} icon={<LogOut className="w-4 h-4" />}>
            Exit
          </Button>
        </div>
      </header>

      {/* Main content grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Record selector list */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Authorized Documents ({data.records.length})
          </h3>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {data.records.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedRecord(rec)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedRecord?.id === rec.id
                    ? 'border-teal-600 bg-teal-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900 truncate">{rec.title}</h4>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{rec.record_date}</span>
                  <span className="capitalize">{rec.category.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Zero direct database access • Fully audited read
          </div>
        </div>

        {/* Selected Document Viewer */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          {selectedRecord ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedRecord.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Original File: {selectedRecord.original_filename} • Date: {selectedRecord.record_date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {data.allow_download && (
                    <a
                      href={`${fileStreamUrl}&download=true`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                </div>
              </div>

              {/* View options tabs */}
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('document')}
                  className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'document'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Document File
                </button>

                {data.include_ai_summary && (
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                      activeTab === 'ai'
                        ? 'border-teal-600 text-teal-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" /> AI Report Analysis
                  </button>
                )}
              </div>

              {/* Content viewport */}
              <div className="flex-1 min-h-[500px]">
                {activeTab === 'document' && (
                  <div className="w-full h-[600px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    {(selectedRecord.mime_type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(selectedRecord.original_filename)) ? (
                      <img
                        src={fileStreamUrl}
                        alt={selectedRecord.title}
                        className="max-h-full max-w-full object-contain p-2"
                      />
                    ) : (
                      <iframe
                        src={fileStreamUrl}
                        title={selectedRecord.title}
                        className="w-full h-full border-0"
                      />
                    )}
                  </div>
                )}

                {activeTab === 'ai' && (
                  selectedRecord.ai_summary ? (
                    <div className="space-y-6 max-w-4xl select-text">
                      {/* Clinical Overview Header Card */}
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
                                Grounded synthesis for consultation review
                              </p>
                            </div>
                          </div>
                          {selectedRecord.ai_summary.overall_status && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {selectedRecord.ai_summary.overall_status}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed pt-1">
                          {selectedRecord.ai_summary.summary_text}
                        </p>
                      </div>

                      {/* AI Clinical Perspective */}
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 rounded-2xl p-5 shadow-sm border border-slate-700/60">
                        <div className="flex items-center gap-2.5 mb-3 text-teal-400">
                          <Compass className="w-5 h-5 flex-shrink-0" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
                            AI Clinical Perspective & Holistic Interpretation
                          </h4>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                          {selectedRecord.ai_summary.ai_perspective || (
                            "This report reflects a collection of specialized physiological indicators. Biomarkers interact dynamically with daily factors such as hydration, circadian cycles, recent nutritional intake, and physical conditioning. Rather than viewing any single measurement in isolation, clinical value comes from looking at overall trends alongside personal health history."
                          )}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                            Clinical Consultation Assistance
                          </span>
                          <span>Model: {selectedRecord.ai_summary.model_name}</span>
                        </div>
                      </div>

                      {/* Structured Biomarkers Table */}
                      {selectedRecord.ai_summary.key_findings && selectedRecord.ai_summary.key_findings.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <Activity className="w-4 h-4 text-teal-600" />
                              Observed Biomarkers & Values ({selectedRecord.ai_summary.key_findings.length})
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
                                {selectedRecord.ai_summary.key_findings.map((item, idx) => (
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
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                        {item.interpretation || 'Reported'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Questions to Discuss with Physician */}
                      {selectedRecord.ai_summary.questions_for_doctor && selectedRecord.ai_summary.questions_for_doctor.length > 0 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 text-teal-700">
                            <MessageSquare className="w-4 h-4" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                              Patient Consultation Inquiries
                            </h4>
                          </div>
                          <ul className="space-y-2">
                            {selectedRecord.ai_summary.questions_for_doctor.map((q, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                <ArrowUpRight className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center max-w-md mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-900">AI Report Analysis</h4>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        An AI summary has not been generated for this document yet. You are authorized to generate a clinical biomarker summary using Google Gemini.
                      </p>
                      {aiError && (
                        <p className="text-xs text-rose-600 mt-3">{aiError}</p>
                      )}
                      <div className="mt-6">
                        <Button
                          variant="primary"
                          size="md"
                          icon={<Sparkles className="w-4 h-4" />}
                          onClick={handleGenerateDoctorAi}
                          loading={isGeneratingAi}
                        >
                          Generate AI Analysis
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
              <p className="text-sm">Select a document from the left list to view.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
