import Image from 'next/image';
import { CheckCircle2, ShieldCheck, Sparkles, TrendingUp, Users, ArrowUpRight } from 'lucide-react';

export function AuthBrandedPanel({ tagline }: { tagline?: string }) {
  return (
    <div className="hidden md:flex md:w-1/2 lg:w-7/12 flex-col justify-between p-10 lg:p-14 relative overflow-hidden bg-gradient-to-br from-[#0c1220] via-[#111827] to-[#161f33] text-white">
      {/* Soft Ambient Background Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Brand Logo */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner mb-8">
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40">
            <Image src="/favicon.png" alt="PeoplePay360 Logo" width={20} height={20} className="rounded-md object-contain" />
          </div>
          <span className="text-base font-extrabold tracking-tight">
            peoplepay<span className="text-[#e6a817]">360</span>
          </span>
          <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20 ml-1">
            Enterprise
          </span>
        </div>

        {/* Tagline & Core Value Prop */}
        <div className="space-y-3 max-w-lg">
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {tagline || 'Manage your workforce, effortlessly'}
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 leading-relaxed font-normal">
            Unified payroll processing, real-time attendance tracking, and intelligent role-based access control built for high-performing organizations.
          </p>
        </div>
      </div>

      {/* Handcrafted Interactive Product Preview Widget */}
      <div className="relative z-10 my-8 max-w-lg">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
          {/* Payrun Widget Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <TrendingUp size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">September 2026 Payrun</span>
                <span className="text-[10px] text-slate-400">48 Active Employees • Monthly Cycle</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Processed
            </span>
          </div>

          {/* Payrun Summary Stats Row */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Gross Payroll</span>
              <span className="text-sm font-extrabold text-white">₹24.85L</span>
            </div>
            <div className="border-x border-white/10">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Tax Deductions</span>
              <span className="text-sm font-extrabold text-amber-400">₹3.12L</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Net Disbursed</span>
              <span className="text-sm font-extrabold text-emerald-400">₹21.73L</span>
            </div>
          </div>

          {/* Sample Employee Verification Rows */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Verification</span>

            {/* Row 1 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                  AM
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block leading-tight">Aarav Mehta</span>
                  <span className="text-[10px] text-slate-400">Senior Payroll Manager • Finance</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-300">₹1,25,000</span>
            </div>

            {/* Row 2 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-[10px] font-bold text-amber-300">
                  AD
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block leading-tight">Ananya Deshmukh</span>
                  <span className="text-[10px] text-slate-400">HR Business Partner • HR</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-300">₹98,500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Bullet Strip */}
      <div className="relative z-10 grid grid-cols-3 gap-4 max-w-lg pt-4 border-t border-white/10 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-[11px]">Automated Tax Calculations</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Users className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-medium text-[11px]">Real-Time Shift Attendance</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-[11px]">Role-Based Workspaces</span>
        </div>
      </div>

      {/* Bottom Footer Badges */}
      <div className="relative z-10 flex items-center gap-4 pt-4 border-t border-white/10 text-[11px] text-slate-400 mt-6">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>SOC2 Type II Certified</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-600" />
        <div>256-Bit SSL Encryption</div>
        <div className="w-1 h-1 rounded-full bg-slate-600" />
        <div className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
          <span>Enterprise Portal</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
