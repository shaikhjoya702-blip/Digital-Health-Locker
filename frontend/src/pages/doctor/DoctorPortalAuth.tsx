import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { sharingService } from '../../services/sharingService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Stethoscope, ShieldCheck, KeyRound, AlertCircle, Clock } from 'lucide-react';

export const DoctorPortalAuth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(true);
  const [error, setError] = useState('');
  const [shareInfo, setShareInfo] = useState<{
    recipient_label?: string;
    expires_at: string;
    record_count: number;
    requires_otp: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing sharing token. Please scan the QR code again.');
      setResolving(false);
      return;
    }

    resolveSession();
  }, [token]);

  const resolveSession = async () => {
    try {
      const res = await sharingService.resolveToken(token);
      setShareInfo(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'This sharing link is invalid, expired, or has been revoked.');
    } finally {
      setResolving(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP provided by the patient.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await sharingService.verifyDoctorOtp(token, otp);
      if (res.doctor_token) {
        // Store scoped doctor token and navigate to viewer
        sessionStorage.setItem('dhl_doctor_token', res.doctor_token);
        navigate('/doctor/viewer');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-700/20">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Healthcare Professional Portal
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Secure, limited-access clinical document review authorized by patient.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
          {resolving ? (
            <div className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-slate-500 mt-3">Validating sharing authorization...</p>
            </div>
          ) : error && !shareInfo ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Access Denied</h3>
              <p className="text-xs text-slate-500 mt-2 mb-6">{error}</p>
              <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200">
                If you believe this is an error, please ask the patient to generate a new QR code or refresh permissions.
              </div>
            </div>
          ) : (
            <div>
              {/* Share authorization metadata */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl mb-6 text-xs text-teal-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  Authorized Consultation
                </p>
                <p>Purpose: <strong>{shareInfo?.recipient_label || 'Medical Review'}</strong></p>
                <p>Records Included: <strong>{shareInfo?.record_count} document(s)</strong></p>
                <p className="text-teal-700">
                  Expires: {new Date(shareInfo!.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-slate-400" /> Enter Patient's 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="block w-full text-center tracking-[0.5em] font-mono text-2xl py-3 rounded-xl border border-slate-300 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                    The patient should provide this 6-digit code displayed on their screen.
                  </p>
                </div>

                <Button variant="primary" type="submit" size="lg" className="w-full mt-2" loading={loading}>
                  Verify & Access Reports
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
