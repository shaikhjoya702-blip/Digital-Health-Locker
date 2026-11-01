import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharingService } from '../../services/sharingService';
import { api, API_BASE_URL } from '../../services/api';
import { MedicalRecord } from '../../types';
import { Button } from '../../components/common/Button';
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
  ArrowUpRight,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<string>('Loading...');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Image & Document Blob streaming state
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState<boolean>(false);
  const [documentError, setDocumentError] = useState<boolean>(false);

  useEffect(() => {
    if (!doctorToken) {
      navigate('/doctor/portal');
      return;
    }
    loadAuthorizedRecords();
  }, [doctorToken]);

  const loadAuthorizedRecords = async () => {
    try {
      const res = await sharingService.getDoctorSharedRecords(doctorToken!);
      setData(res);
      if (res.records && res.records.length > 0) {
        setSelectedRecord(res.records[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Access expired or was revoked by the patient.');
    } finally {
      setLoading(false);
    }
  };

  // Expiration countdown with strict UTC parsing
  useEffect(() => {
    if (!data?.expires_at) return;

    const timer = setInterval(() => {
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

  const handleGenerateDoctorAi = async () => {
    if (!selectedRecord) return;
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const res = await sharingService.generateDoctorRecordSummary(doctorToken!, selectedRecord.id);
      setSelectedRecord((prev) => (prev ? { ...prev, ai_summary: res.ai_summary } : prev));
      if (data) {
        setData({
          ...data,
          records: data.records.map((r) =>
            r.id === selectedRecord.id ? { ...r, ai_summary: res.ai_summary } : r
          ),
        });
      }
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'Failed to generate AI perspective.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Direct Stream URL
  const fileStreamUrl = useMemo(() => {
    if (!selectedRecord) return '';
    return `${API_BASE_URL}/public/share/records/${selectedRecord.id}/view?token=${encodeURIComponent(doctorToken || '')}`;
  }, [selectedRecord?.id, doctorToken]);

  const isImageFile = useMemo(() => {
    if (!selectedRecord) return false;
    return (
      selectedRecord.mime_type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(selectedRecord.original_filename)
    );
  }, [selectedRecord]);

  // Fetch document through authenticated endpoint to create a reliable in-memory Blob URL
  useEffect(() => {
    if (!selectedRecord) {
      setBlobUrl(null);
      return;
    }

    let isMounted = true;
    setDocumentLoading(true);
    setDocumentError(false);

    const fetchBlob = async () => {
      try {
        const response = await api.get(
          `/public/share/records/${selectedRecord.id}/view`,
          {
            headers: { Authorization: `Bearer ${doctorToken}` },
            params: { token: doctorToken },
            responseType: 'blob',
          }
        );
        if (isMounted) {
          const objectUrl = URL.createObjectURL(response.data);
          setBlobUrl(objectUrl);
          setDocumentLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          // If blob fetch fails, fall back to direct fileStreamUrl
          setBlobUrl(fileStreamUrl);
          setDocumentLoading(false);
        }
      }
    };

    fetchBlob();

    return () => {
      isMounted = false;
    };
  }, [selectedRecord?.id, doctorToken, fileStreamUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading Clinical Records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full text-center border border-slate-200 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Session Terminated</h3>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            {error || 'This consultation access grant is expired or has been revoked.'}
          </p>
          <Button variant="primary" onClick={handleExit} className="w-full py-2.5">
            Exit Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Responsive Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left branding & patient alias */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {data.patient_alias}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-teal-700 font-medium truncate">
                Clinical Viewer
              </p>
            </div>
          </div>

          {/* Right status timer & exit */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2 sm:px-3 py-1 bg-amber-50 text-amber-800 rounded-lg sm:rounded-xl border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>{timeLeft}</span>
            </div>

            <button
              onClick={handleExit}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Exit Doctor Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Horizontal Document Carousel (screens < lg) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {data.records.map((rec) => {
            const isSelected = selectedRecord?.id === rec.id;
            const isImg = rec.mime_type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(rec.original_filename);
            return (
              <button
                key={rec.id}
                onClick={() => {
                  setSelectedRecord(rec);
                  setDocumentError(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isImg ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span className="max-w-[120px] sm:max-w-[180px] truncate">{rec.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Desktop Sidebar: Authorized Documents List (lg:col-span-1) */}
        <aside className="hidden lg:flex flex-col bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Authorized Records
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
              {data.records.length}
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {data.records.map((rec) => {
              const isSelected = selectedRecord?.id === rec.id;
              const isImg = rec.mime_type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(rec.original_filename);

              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    setSelectedRecord(rec);
                    setDocumentError(false);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isImg ? (
                      <ImageIcon className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-slate-900 truncate">{rec.title}</h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{rec.record_date}</span>
                    <span className="capitalize">{rec.category.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Audited Clinical Read-Only Access</span>
          </div>
        </aside>

        {/* Selected Document & AI Analysis Viewport (lg:col-span-3) */}
        <main className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col min-w-0">
          {selectedRecord ? (
            <div className="flex-1 flex flex-col space-y-4 min-w-0">
              {/* Document Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {selectedRecord.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="truncate max-w-[200px] sm:max-w-none">
                      File: {selectedRecord.original_filename}
                    </span>
                    <span>•</span>
                    <span>Date: {selectedRecord.record_date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {data.allow_download && (
                    <a
                      href={`${fileStreamUrl}&download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>

              {/* View Mode Tabs */}
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
                  <span>Document File</span>
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
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>AI Report Analysis</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Document File Preview Container */}
              {activeTab === 'document' && (
                <div className="w-full h-[55vh] min-h-[360px] sm:h-[620px] bg-slate-900/5 rounded-2xl overflow-hidden border border-slate-200 relative flex items-center justify-center p-2">
                  {documentLoading ? (
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="animate-spin w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full mb-2" />
                      <p className="text-xs font-medium">Loading document...</p>
                    </div>
                  ) : documentError ? (
                    <div className="text-center p-6 max-w-sm">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Preview Notice</h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                        This document file is syncing with storage. You can open it in a new window or download it directly.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={fileStreamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-semibold hover:bg-teal-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open File
                        </a>
                      </div>
                    </div>
                  ) : isImageFile ? (
                    <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-2">
                      <img
                        src={blobUrl || fileStreamUrl}
                        alt={selectedRecord.title}
                        onError={() => setDocumentError(true)}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <iframe
                      src={blobUrl || fileStreamUrl}
                      title={selectedRecord.title}
                      className="w-full h-full border-0 rounded-xl"
                      onError={() => setDocumentError(true)}
                    />
                  )}

                  {/* Floating Action Button to Open Full Document */}
                  {!documentLoading && !documentError && (
                    <a
                      href={fileStreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-300 text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shadow-md flex items-center gap-1 transition-all"
                      title="Open document in a new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open New Tab</span>
                    </a>
                  )}
                </div>
              )}

              {/* Tab 2: AI Report Analysis View */}
              {activeTab === 'ai' && (
                selectedRecord.ai_summary ? (
                  <div className="space-y-5 max-w-4xl select-text">
                    {/* Clinical Overview Hero Card */}
                    <div className="bg-gradient-to-br from-teal-50/80 via-white to-slate-50 p-4 sm:p-5 rounded-2xl border border-teal-100/90 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                            <HeartPulse className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              Clinical Health Summary
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-slate-500">
                              Empathetic synthesis for patient consultation
                            </p>
                          </div>
                        </div>

                        {selectedRecord.ai_summary.overall_status && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {selectedRecord.ai_summary.overall_status}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-1">
                        {selectedRecord.ai_summary.summary_text}
                      </p>
                    </div>

                    {/* AI Clinical Perspective & Holistic Interpretation Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700/60">
                      <div className="flex items-center gap-2 mb-2.5 text-teal-400">
                        <Compass className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
                          AI Clinical Perspective & Interconnected Physiology
                        </h4>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                        {selectedRecord.ai_summary.ai_perspective || (
                          "This report reflects a dynamic collection of physiological indicators. Blood markers continuously interact with daily lifestyle factors such as hydration, sleep quality, recent nutrition, and physical stress. For the best clinical guidance, consider these values in context with your medical history and ongoing trends."
                        )}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-teal-400" />
                          Consultation Guide
                        </span>
                        <span>Model: {selectedRecord.ai_summary.model_name}</span>
                      </div>
                    </div>

                    {/* Structured Biomarkers: Responsive Table on desktop / Cards on mobile */}
                    {selectedRecord.ai_summary.key_findings && selectedRecord.ai_summary.key_findings.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-teal-600" />
                            Observed Biomarkers ({selectedRecord.ai_summary.key_findings.length})
                          </h4>
                          <span className="text-[10px] sm:text-[11px] text-slate-400">Standard references</span>
                        </div>

                        {/* Mobile Cards (visible on sm screens) */}
                        <div className="sm:hidden space-y-2">
                          {selectedRecord.ai_summary.key_findings.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900">{item.parameter}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                                  {item.interpretation || 'Reported'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-slate-200/60">
                                <span className="font-semibold text-slate-800">Value: {item.observed_value}</span>
                                <span className="text-slate-500 text-[11px]">Ref: {item.reference_range || 'N/A'}</span>
                              </div>
                              {item.significance && (
                                <p className="text-[11px] text-slate-500 mt-1 italic leading-normal">
                                  {item.significance}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table (hidden on mobile, visible on sm and up) */}
                        <div className="hidden sm:block overflow-hidden border border-slate-200/90 rounded-2xl shadow-2xs bg-white">
                          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200/60">
                              <tr>
                                <th className="px-4 py-3">Biomarker / Test</th>
                                <th className="px-4 py-3">Observed Value</th>
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
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2 text-teal-700">
                          <MessageSquare className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Suggested Questions for Consultation
                          </h4>
                        </div>
                        <ul className="space-y-1.5">
                          {selectedRecord.ai_summary.questions_for_doctor.map((q, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <ArrowUpRight className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-center max-w-md mx-auto px-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">AI Report Analysis</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      An AI summary has not been generated for this document yet. You can trigger an on-demand clinical perspective now.
                    </p>
                    {aiError && (
                      <p className="text-xs text-rose-600 mt-2">{aiError}</p>
                    )}
                    <div className="mt-5">
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <FileText className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs">Select a document from the list above to view.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
