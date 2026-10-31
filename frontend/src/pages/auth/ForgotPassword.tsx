import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { KeyRound, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authService.forgotPassword(email);
      setSubmitted(true);
      if (res.dev_reset_token) {
        setDevToken(res.dev_reset_token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit password recovery request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">Recover Your Password</h3>
          <p className="text-xs text-slate-500 mb-6">
            Enter your email to receive a single-use, 15-minute password reset link.
          </p>

          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-left text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1.5" />
                <p className="font-semibold">Reset Link Sent</p>
                <p className="mt-1">
                  If <strong>{email}</strong> is associated with an account, instructions have been dispatched.
                </p>
              </div>

              {devToken && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-left text-xs">
                  <p className="font-bold">Development Mode Notice:</p>
                  <p className="mt-1">SMTP is unconfigured. Direct reset link:</p>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    className="text-health-700 font-semibold underline block mt-1 break-all"
                  >
                    Click here to reset password directly
                  </Link>
                </div>
              )}

              <Link to="/signin" className="inline-block text-xs font-semibold text-health-600 hover:text-health-700">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Button variant="primary" type="submit" size="lg" className="w-full mt-2" loading={loading}>
                Send Reset Link
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
