import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CheckCircle2, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';
  const initialDevCode = (location.state as any)?.dev_code || '';

  const [code, setCode] = useState(initialDevCode);
  const [email, setEmail] = useState(emailParam);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-verify if URL token is present
  useEffect(() => {
    if (tokenParam) {
      handleAutoTokenVerify(tokenParam);
    }
  }, [tokenParam]);

  const handleAutoTokenVerify = async (tok: string) => {
    setLoading(true);
    try {
      await authService.verifyEmail({ token: tok });
      setSuccess(true);
      await refreshUser();
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !email) {
      setError('Please provide your email address and 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.verifyEmail({ email, code });
      setSuccess(true);
      await refreshUser();
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">Verify Your Email</h3>
          <p className="text-xs text-slate-500 mb-6">
            Enter the 6-digit confirmation code dispatched to your mailbox to activate your locker.
          </p>

          {success ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold">Email Verified Successfully!</h4>
              <p className="text-xs mt-1">Redirecting you to your patient dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4 text-left">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {initialDevCode && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                  <span className="font-bold">Development Mode Notice: </span>
                  Verification code prefilled from backend: <strong>{initialDevCode}</strong>
                </div>
              )}

              <Input
                label="Registered Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="block w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 rounded-lg border border-slate-300 focus:border-health-600 focus:outline-none focus:ring-2 focus:ring-health-500"
                  required
                />
              </div>

              <Button variant="primary" type="submit" size="lg" className="w-full mt-2" loading={loading}>
                Verify & Activate Account
              </Button>

              <div className="text-center pt-2">
                <Link to="/signin" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
