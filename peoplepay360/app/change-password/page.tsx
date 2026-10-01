'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthBrandedPanel } from '@/components/auth/AuthBrandedPanel';
import { AlertCircle, CheckCircle2, Lock, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccess('Your password has been updated successfully.');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl min-h-[640px] bg-white rounded-3xl border border-[#e5ded4] shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Column: Corporate Branding Panel */}
        <AuthBrandedPanel tagline="Update Account Password" />

        {/* Right Column: Change Password Form Panel */}
        <div className="w-full md:w-1/2 lg:w-5/12 p-8 sm:p-12 flex flex-col justify-center bg-white">
          {/* Mobile Logo Branding */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <Image src="/favicon.png" alt="PeoplePay360" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              peoplepay<span className="text-[#e6a817]">360</span>
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mb-6">
            <ShieldCheck className="size-6 text-[#c99a2e]" />
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Change Password</h2>
            <p className="text-xs text-[#8a7a6d]">
              Ensure your account is using a long, random password to stay secure.
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
                <span>Password Updated</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="change-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email (Optional if signed in)
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <input
                  id="change-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@oxp.example"
                  className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="current-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Password
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <Lock className="size-4 text-slate-400 shrink-0" />
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <Lock className="size-4 text-slate-400 shrink-0" />
                <input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <Lock className="size-4 text-slate-400 shrink-0" />
                <input
                  id="confirm-new-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#f0ece5] text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#8a7a6d] hover:text-slate-900 transition-colors">
              <ArrowLeft size={14} />
              <span>Back to Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
