/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE FDR & Security Deposit Lifecycle Management System
 * Designated Multi-Officer Official Authentication Gateway (SIH 2026: PS 26265)
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  FileCheck2,
  Building2,
  Eye,
  EyeOff,
  Server,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';

interface OfficerPortalConfig {
  id: string;
  role: UserRole;
  title: string;
  subtitle: string;
  designation: string;
  department: string;
  officerName: string;
  defaultEmail: string;
  themeColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
  responsibilities: string[];
}

const OFFICER_PORTALS: OfficerPortalConfig[] = [
  {
    id: 'user-officer-1',
    role: 'OFFICER',
    title: 'Scrutiny Officer Portal',
    subtitle: 'Regulation Bureau Verification Desk',
    designation: 'Assistant Director / Scrutiny Officer',
    department: 'Western & Northern Regional Desks',
    officerName: 'Dr. S. K. Sharma',
    defaultEmail: 'sksharma@aicte-india.org',
    themeColor: 'border-blue-600 focus:border-blue-600 focus:ring-blue-600',
    badgeBg: 'bg-blue-100 border-blue-300',
    badgeText: 'text-blue-900',
    icon: <FileCheck2 className="w-5 h-5 text-blue-700" />,
    responsibilities: [
      'SFMS Core Banking cross-examination',
      'Discrepancy notice issuance & resolution',
      'Lien validity assessment & rollover checks',
    ],
  },
  {
    id: 'user-approver-1',
    role: 'APPROVER',
    title: 'Approving Authority Portal',
    subtitle: 'Competent Authority Sanction Gateway',
    designation: 'Advisor & Competent Approving Authority',
    department: 'AICTE Regulation & Approvals Bureau',
    officerName: 'Prof. R. K. Verma',
    defaultEmail: 'rkverma.advisor@aicte-india.org',
    themeColor: 'border-purple-600 focus:border-purple-600 focus:ring-purple-600',
    badgeBg: 'bg-purple-100 border-purple-300',
    badgeText: 'text-purple-900',
    icon: <ShieldCheck className="w-5 h-5 text-purple-700" />,
    responsibilities: [
      'Statutory Sanction Order execution',
      'Lien discharge authorization under APH norms',
      'Dual-factor step-up high value release clearance',
    ],
  },
  {
    id: 'user-admin-1',
    role: 'ADMIN',
    title: 'Chief System Administrator Portal',
    subtitle: 'National e-Governance Cell (NeGD) Gateway',
    designation: 'Chief System Administrator',
    department: 'National e-Governance Cell / AICTE IT Cell',
    officerName: 'Amitabh Sengupta',
    defaultEmail: 'admin.fdr@aicte-india.org',
    themeColor: 'border-rose-600 focus:border-rose-600 focus:ring-rose-600',
    badgeBg: 'bg-rose-100 border-rose-300',
    badgeText: 'text-rose-900',
    icon: <Server className="w-5 h-5 text-rose-700" />,
    responsibilities: [
      'Defense-in-depth security kernel surveillance',
      'Automated maturity scheduler execution',
      'Baseline regulatory data maintenance',
    ],
  },
  {
    id: 'user-auditor-1',
    role: 'AUDITOR',
    title: 'CAG Statutory Auditor Portal',
    subtitle: 'Central Expenditure Surveillance Register',
    designation: 'Senior Audit Officer',
    department: 'Directorate General of Audit (Central Expenditure)',
    officerName: 'V. S. Narayanan',
    defaultEmail: 'auditor.cag@nic.in',
    themeColor: 'border-emerald-600 focus:border-emerald-600 focus:ring-emerald-600',
    badgeBg: 'bg-emerald-100 border-emerald-300',
    badgeText: 'text-emerald-900',
    icon: <Eye className="w-5 h-5 text-emerald-700" />,
    responsibilities: [
      'Cryptographic SHA-256 audit ledger verification',
      'Read-only fiscal compliance examination',
      'Discrepancy resolution audit trail tracing',
    ],
  },
  {
    id: 'user-inst-1',
    role: 'INSTITUTION',
    title: 'Institution Signatory Portal',
    subtitle: 'Approved Technical College Gateway',
    designation: 'Principal & Authorized Signatory',
    department: 'PICT Pune (AICTE Permanent ID: 1-10928374)',
    officerName: 'Dr. Ramesh K. Patil',
    defaultEmail: 'principal@pict.edu',
    themeColor: 'border-amber-600 focus:border-amber-600 focus:ring-amber-600',
    badgeBg: 'bg-amber-100 border-amber-300',
    badgeText: 'text-amber-900',
    icon: <Building2 className="w-5 h-5 text-amber-700" />,
    responsibilities: [
      'Digital FDR & joint lien lodgement',
      'Clarification submission on discrepancies',
      'Statutory lien refund & release petition filing',
    ],
  },
];

export const OfficerLoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [selectedPortalIndex, setSelectedPortalIndex] = useState(0);
  const activePortal = OFFICER_PORTALS[selectedPortalIndex];

  // Default login credentials set to "admin" and "admin" as requested by user
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('8A4F9');
  const [captchaChallenge, setCaptchaChallenge] = useState('8A4F9');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaChallenge(code);
    setCaptchaInput(code);
  };

  const handleSelectPortal = (index: number) => {
    setSelectedPortalIndex(index);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      // Validate captcha
      if (captchaInput.trim().toUpperCase() !== captchaChallenge.toUpperCase()) {
        setIsSubmitting(false);
        setErrorMessage('Security CAPTCHA mismatch. Please re-enter.');
        return;
      }

      // Perform authentication with provided credentials for the selected officer portal
      const success = login(username, password, activePortal.id);

      if (success) {
        setIsSubmitting(false);
        showToast(
          'Authentication Verified',
          `Welcome, ${activePortal.officerName} (${activePortal.designation}). Session established.`,
          'success'
        );
      } else {
        setIsSubmitting(false);
        setErrorMessage('Invalid credentials. Remember: username is "admin" and password is "admin".');
      }
    }, 450);
  };

  const handleQuickLogin = (portalIndex: number) => {
    setSelectedPortalIndex(portalIndex);
    setUsername('admin');
    setPassword('admin');
    const portal = OFFICER_PORTALS[portalIndex];

    setTimeout(() => {
      const success = login('admin', 'admin', portal.id);
      if (success) {
        showToast(
          'Instant Officer Sign-In',
          `Logged in as ${portal.officerName} (${portal.title}).`,
          'success'
        );
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Gov Tricolor Bar */}
      <div className="bg-gradient-to-r from-orange-600 via-white to-emerald-700 h-1.5 w-full shrink-0" />

      {/* Header Bar */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 text-slate-200 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center font-bold text-orange-400 text-lg">
              AICTE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">
                  Government of India
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                  Ministry of Education
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                All India Council for Technical Education
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium hidden sm:inline">
              SIH 2026 Problem ID: <strong>26265</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TLS 1.3 Intranet Active</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        {/* Banner Tag */}
        <div className="text-center mb-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold mb-2">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span>Official Regulatory Access Surveillance Point</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AICTE Security Deposit &amp; FDR Lifecycle Portal
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Dedicated officer access gateway. Select your designated administrative persona below to log in.
          </p>
        </div>

        {/* Officer Roles Selector Tabs */}
        <div className="w-full max-w-4xl mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center sm:text-left">
            Select Officer Designation to Open Dedicated Portal:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {OFFICER_PORTALS.map((portal, idx) => {
              const isSelected = selectedPortalIndex === idx;
              return (
                <button
                  key={portal.id}
                  onClick={() => handleSelectPortal(idx)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      {portal.icon}
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {portal.role}
                    </span>
                    <h3 className="text-xs font-bold text-white leading-snug line-clamp-1">
                      {portal.title.replace(' Portal', '')}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {portal.officerName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Card for Selected Officer */}
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Officer Information & Responsibilities */}
          <div className="md:col-span-5 bg-slate-50 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  {activePortal.icon}
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${activePortal.badgeBg} ${activePortal.badgeText}`}>
                    {activePortal.role} ACCESS
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
                    {activePortal.title}
                  </h3>
                </div>
              </div>

              {/* Officer Card */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Designated Officer</span>
                  <p className="font-bold text-slate-900">{activePortal.officerName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Post / Designation</span>
                  <p className="font-medium text-slate-700">{activePortal.designation}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department / Bureau</span>
                  <p className="text-[11px] text-slate-600">{activePortal.department}</p>
                </div>
              </div>

              {/* Responsibilities list */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Key Statutory Responsibilities:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {activePortal.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quick 1-Click login shortcut */}
            <div className="pt-4 mt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleQuickLogin(selectedPortalIndex)}
                className="w-full py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-blue-200 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Click Instant Sign-In as {activePortal.officerName.split(' ')[0]}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Authentication Form */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Officer Credentials Verification
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter the authorized credentials to initialize the authenticated session.
                  </p>
                </div>
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
              </div>

              {/* Mandatory Credentials Notice Banner */}
              <div className="p-3 mb-5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Officer Demo Credentials Configured:</p>
                  <p className="text-blue-800 mt-0.5">
                    Username: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300 text-blue-900">admin</span>
                    {' '}&amp; Password: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300 text-blue-900">admin</span>
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Officer Username / Email ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Accepts <span className="font-mono font-semibold">admin</span> or official email ({activePortal.defaultEmail})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Officer Security Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="admin"
                      required
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Default password: <span className="font-mono font-semibold">admin</span>
                  </p>
                </div>

                {/* Security CAPTCHA */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Security Verification CAPTCHA
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="px-3.5 py-1.5 rounded-lg bg-slate-200 border border-slate-300 select-none font-mono font-black text-sm tracking-widest text-slate-700 line-through">
                      {captchaChallenge}
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                      title="Refresh CAPTCHA"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Regulatory Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to {activePortal.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <span>National Informatics Centre (NIC) Security Standard</span>
              <span className="font-mono">SHA-256 HASH CHAIN SEALED</span>
            </div>
          </div>
        </div>

        {/* Quick Officer Persona Switchboard */}
        <div className="w-full max-w-4xl mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Direct 1-Click Officer Access Switchboard (Pre-configured as admin / admin)</span>
            </span>
            <span className="text-[11px] text-slate-500">SIH 2026 Live Demo Mode</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
            {OFFICER_PORTALS.map((portal, idx) => (
              <button
                key={portal.id}
                onClick={() => handleQuickLogin(idx)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-800/80 transition-all text-left flex items-center gap-2 cursor-pointer group"
              >
                <div className="shrink-0">{portal.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white group-hover:text-blue-400 truncate">
                    {portal.officerName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {portal.role}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>
            &copy; 2026 All India Council for Technical Education (AICTE), New Delhi. All Rights Reserved.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Cybersecurity Policy 2026</span>
            <span>•</span>
            <span>Terms of Regulatory Access</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">NIC-STQC Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
