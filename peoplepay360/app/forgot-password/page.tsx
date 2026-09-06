'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AuthBrandedPanel } from '@/components/auth/AuthBrandedPanel';
import { AlertCircle, CheckCircle2, Mail, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid work email address.');
      return;
    }

    setBusy(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit password reset request.');
      }

      setSuccess(data.message || 'Password reset link sent to your work email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl min-h-[600px] bg-white rounded-3xl border border-[#e5ded4] shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Column: Corporate Branding Panel */}
        <AuthBrandedPanel tagline="Secure Account Recovery" />

        {/* Right Column: Forgot Password Form Panel */}
        <div className="w-full md:w-1/2 lg:w-5/12 p-8 sm:p-12 flex flex-col justify-center bg-white">
          {/* Mobile Logo Branding */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <Image src="/favicon.png" alt="PeoplePay360" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              peoplepay<span className="text-[#e6a817]">360</span>
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mb-6">
            <KeyRound className="size-6 text-[#c99a2e]" />
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Forgot password?</h2>
            <p className="text-xs text-[#8a7a6d]">
              Enter your work email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Instructions Sent</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-700">{success}</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email Address
                </label>
                <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                  <Mail className="size-4 text-slate-400 shrink-0" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@oxp.example"
                    className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full pill-btn pill-btn-black !py-2.5 justify-center text-xs font-semibold cursor-pointer disabled:opacity-50 mt-2 flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-[#f0ece5] text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#8a7a6d] hover:text-slate-900 transition-colors">
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
