'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthBrandedPanel } from '@/components/auth/AuthBrandedPanel';
import { AlertCircle, CheckCircle2, User, Mail, Lock, ArrowRight, RefreshCw } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validations
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setSuccess('Account created successfully! Redirecting to workspace...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl min-h-[640px] bg-white rounded-3xl border border-[#e5ded4] shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Column: Corporate Branding Panel */}
        <AuthBrandedPanel tagline="Join your workforce on PeoplePay360" />

        {/* Right Column: Sign Up Form Panel */}
        <div className="w-full md:w-1/2 lg:w-5/12 p-8 sm:p-12 flex flex-col justify-center bg-white">
          {/* Mobile Logo Branding */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <Image src="/favicon.png" alt="PeoplePay360" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              peoplepay<span className="text-[#e6a817]">360</span>
            </span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create an account</h2>
            <p className="text-xs text-[#8a7a6d]">
              Get started with your company work email to access your workspace.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <User className="size-4 text-slate-400 shrink-0" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <Mail className="size-4 text-slate-400 shrink-0" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex.morgan@oxp.example"
                  className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <Lock className="size-4 text-slate-400 shrink-0" />
                <input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all flex items-center gap-2 px-3 rounded-xl">
                <Lock className="size-4 text-slate-400 shrink-0" />
                <input
                  id="signup-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#f0ece5] text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/" className="font-semibold text-[#c99a2e] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
