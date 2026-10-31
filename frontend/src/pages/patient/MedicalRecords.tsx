import React, { useState, useEffect } from 'react';
import { MedicalRecord, RecordCategory } from '../../types';
import { recordService } from '../../services/recordService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { RecordUploadModal } from '../../components/records/RecordUploadModal';
import { RecordViewerModal } from '../../components/records/RecordViewerModal';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Sparkles, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export const MedicalRecords: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useNotification();

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await recordService.getRecords({
        category: category !== 'all' ? category : undefined,
        search: search || undefined,
      });
      setRecords(data);
    } catch (err) {
      showToast('error', 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecords();
  };

  const handleUpload = async (formData: FormData) => {
    await recordService.uploadRecord(formData);
    showToast('success', 'Document Uploaded', 'OCR extraction initiated.');
    loadRecords();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this medical record?')) {
      return;
    }

    setDeletingId(id);
    try {
      await recordService.deleteRecord(id);
      showToast('success', 'Record Deleted', 'Record moved to trash.');
      loadRecords();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryBadge = (cat: RecordCategory) => {
    switch (cat) {
      case 'blood_test':
        return <Badge variant="danger">Blood Test</Badge>;
      case 'prescription':
        return <Badge variant="info">Prescription</Badge>;
      case 'radiology':
        return <Badge variant="warning">Radiology</Badge>;
      case 'discharge_summary':
        return <Badge variant="primary">Discharge</Badge>;
      default:
        return <Badge variant="neutral">Other</Badge>;
    }
  };

  const categories = [
    { id: 'all', label: 'All Records' },
    { id: 'blood_test', label: 'Blood Tests' },
    { id: 'prescription', label: 'Prescriptions' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'discharge_summary', label: 'Discharge Summaries' },
    { id: 'other', label: 'Other Documents' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medical Records Library</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Store, inspect, search OCR text, and generate AI-assisted summaries of your medical reports.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload Medical Record
        </Button>
      </div>

      {/* Category filter pills & Search bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, doctor notes, or extracted OCR text..."
              className="block w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-health-500 focus:border-health-600"
            />
          </div>
          <Button variant="secondary" size="md" type="submit">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                category === cat.id
                  ? 'bg-health-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-health-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-500 mt-3">Loading medical records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center max-w-lg mx-auto">
          <FileText className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Medical Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Upload your laboratory tests, doctor prescriptions, or radiology imaging to keep them organized.
          </p>
          <Button variant="primary" size="md" icon={<Upload className="w-4 h-4" />} onClick={() => setIsUploadOpen(true)}>
            Upload Your First Record
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setSelectedRecord(rec)}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-health-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  {getCategoryBadge(rec.category)}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(rec.id, e)}
                      title="Delete Record"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-health-700 transition-colors line-clamp-2">
                  {rec.title}
                </h3>

                {rec.notes && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                    "{rec.notes}"
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {rec.record_date}
                </span>

                <div className="flex items-center gap-2">
                  {rec.has_ai_summary && (
                    <span className="flex items-center gap-1 text-teal-600 font-semibold" title="AI Summary Available">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      AI
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-semibold text-health-600 group-hover:translate-x-0.5 transition-transform">
                    View <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RecordUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
      />

      <RecordViewerModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onRecordUpdated={loadRecords}
      />
    </div>
  );
};
