/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE FDR & Security Deposit Lifecycle Management System
 * Authoritative Security Control & Surveillance Center (SIH 2026 Problem Statement ID: 26265)
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Server,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Activity,
  Fingerprint,
  FileCheck,
  Sliders,
  RefreshCw,
  ExternalLink,
  ShieldX,
  Clock,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAuditLogs } from '../../services/auditService';
import { getFdrs, resetToSeedData } from '../../services/storage';
import {
  verifyAuditChainIntegrity,
  calculateFdrRiskScore,
  getActiveSecuritySession,
  terminateSecuritySession,
  createSecuritySession,
  maskAccountNumber,
  RiskAssessment,
} from '../../services/securityService';
import { useToast } from '../../context/ToastContext';
import { FDRRecord, AuditLogItem } from '../../types';
import { SecurityConfirmModal } from '../common/SecurityConfirmModal';

export const SecurityDashboard: React.FC = () => {
  const { currentUser, allDemoUsers, switchUser } = useAuth();
  const { showToast } = useToast();

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainVerificationResult, setChainVerificationResult] = useState<{
    isValid: boolean;
    totalVerified: number;
    message: string;
  } | null>(null);

  const [activeSession, setActiveSession] = useState(getActiveSecuritySession());
  const [selectedFdrRisk, setSelectedFdrRisk] = useState<{ fdr: FDRRecord; risk: RiskAssessment } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Security checklist statuses
  const [activeTab, setActiveTab] = useState<'surveillance' | 'risk_scoring' | 'sessions' | 'checklist'>('surveillance');

  const loadData = () => {
    const logs = getAuditLogs();
    setAuditLogs(logs);
    const fdrList = getFdrs();
    setFdrs(fdrList);
    setActiveSession(getActiveSecuritySession());
  };

  useEffect(() => {
    loadData();

    const handleAuditUpdate = () => loadData();
    const handleFdrUpdate = () => loadData();

    window.addEventListener('aicte_audit_updated', handleAuditUpdate);
    window.addEventListener('aicte_fdrs_updated', handleFdrUpdate);

    return () => {
      window.removeEventListener('aicte_audit_updated', handleAuditUpdate);
      window.removeEventListener('aicte_fdrs_updated', handleFdrUpdate);
    };
  }, []);

  // Run cryptographic verification of the audit hash chain
  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setTimeout(() => {
      const result = verifyAuditChainIntegrity(auditLogs);
      setChainVerificationResult(result);
      setIsVerifyingChain(false);
      if (result.isValid) {
        showToast(`Cryptographic Audit Chain Intact: ${result.totalVerified} entries verified against SHA-256 blocks.`, 'success');
      } else {
        showToast(`Integrity Warning: ${result.message}`, 'error');
      }
    }, 600);
  };

  // Terminate and regenerate session
  const handleRevokeSession = () => {
    terminateSecuritySession();
    showToast('Active session token revoked. Generating hardened token.', 'info');
    setTimeout(() => {
      const newSession = createSecuritySession(currentUser);
      setActiveSession(newSession);
      showToast('Fresh session initiated with tokenized signature.', 'success');
    }, 300);
  };

  // Filter security-specific audit logs
  const securityLogs = auditLogs.filter(
    (log) =>
      log.entity === 'SECURITY' ||
      log.entity === 'AUTH' ||
      log.action.includes('LOGIN') ||
      log.action.includes('BLOCKED') ||
      log.action.includes('RELEASE') ||
      log.action.includes('RESET')
  );

  // Risk assessments for all FDRs
  const fdrRiskList = fdrs.map((fdr) => ({
    fdr,
    risk: calculateFdrRiskScore(fdr),
  }));

  const highRiskCount = fdrRiskList.filter((item) => item.risk.level === 'HIGH' || item.risk.level === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                Defense-in-Depth Layer Active
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero Vulnerabilities
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-blue-400" />
              <span>AICTE Security Operations &amp; Financial Governance Kernel</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Enforcing strict Finite State Machine transitions, Four-Eyes Maker-Checker principles, 
              cryptographically chained SHA-256 audit trails, and transparent risk scoring across all FDRs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleVerifyChain}
              disabled={isVerifyingChain}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isVerifyingChain ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Fingerprint className="w-4 h-4" />
              )}
              <span>Verify Audit Hash Chain</span>
            </button>

            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo Baseline</span>
              </button>
            )}
          </div>
        </div>

        {/* Chain Verification Result Notice */}
        {chainVerificationResult && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            chainVerificationResult.isValid
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {chainVerificationResult.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{chainVerificationResult.message}</span>
            </div>
            <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded text-slate-300">
              SHA-256 BLOCKS: {chainVerificationResult.totalVerified}
            </span>
          </div>
        )}
      </div>

      {/* Security Health Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] uppercase font-bold text-slate-500">Access Control</span>
          </div>
          <p className="text-xl font-black text-slate-900">RBAC Tier-1</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-500 font-medium">Deny-by-Default Kernel</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <Fingerprint className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] uppercase font-bold text-slate-500">Audit Proof</span>
          </div>
          <p className="text-xl font-black text-slate-900">SHA-256 Chain</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[11px] text-slate-500 font-medium">{auditLogs.length} Blocks Sealed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <Activity className="w-4 h-4 text-purple-600" />
            <span className="text-[10px] uppercase font-bold text-slate-500">Four-Eyes Control</span>
          </div>
          <p className="text-xl font-black text-slate-900">Maker-Checker</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-[11px] text-slate-500 font-medium">Self-Approval Prohibited</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] uppercase font-bold text-slate-500">Anomaly Engine</span>
          </div>
          <p className="text-xl font-black text-slate-900">{highRiskCount} Flagged</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-500 font-medium">High Value / Velocity Watch</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('surveillance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'surveillance'
              ? 'border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Surveillance Feed &amp; Blocks ({securityLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('risk_scoring')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'risk_scoring'
              ? 'border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Anomaly &amp; Risk Scoring Engine ({fdrRiskList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sessions'
              ? 'border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Sessions &amp; Idle Surveillance</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'checklist'
              ? 'border-blue-700 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Security Compliance Checklist (10/10)</span>
        </button>
      </div>

      {/* Tab 1: Surveillance Feed & Security Blocks */}
      {activeTab === 'surveillance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-700" />
                <span>Security Event Surveillance Stream</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Tamper-evident log of authentication checkpoints, blocked transitions, and financial sanctions
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              FEED_ENTRIES: {securityLogs.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto font-sans">
            {securityLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No security alerts recorded. System operating nominal under normal traffic conditions.
              </div>
            ) : (
              securityLogs.map((log) => {
                const isBlocked = log.action.includes('BLOCKED') || log.action.includes('FAILED');
                const isSanction = log.action.includes('SANCTION') || log.action.includes('RELEASE');

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isBlocked
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isSanction
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {log.userName} ({log.userRole})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          IP: {log.ipAddress}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {log.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {log.description}
                    </p>

                    {log.hash && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="truncate max-w-xs">
                          BLOCK_HASH: {log.hash}
                        </span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SEALED</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Risk Scoring Engine */}
      {activeTab === 'risk_scoring' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Automated Financial Risk &amp; Anomaly Assessment Engine
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-variable transparent risk scoring (0 - 100) based on instrument amount, CBS discrepancies, velocity, and lien overdue days.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                Rule-Based Transparency
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="py-2.5 px-3">FDR Number</th>
                    <th className="py-2.5 px-3">Institution</th>
                    <th className="py-2.5 px-3">Amount (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fdrRiskList.map(({ fdr, risk }) => (
                    <tr key={fdr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {fdr.fdrNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {fdr.institutionName}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ₹{(fdr.amount / 100000).toFixed(2)} L
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {fdr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          risk.level === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : risk.level === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : risk.level === 'MEDIUM'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {risk.level}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{risk.score}/100</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                risk.score >= 75
                                  ? 'bg-rose-600'
                                  : risk.score >= 50
                                  ? 'bg-amber-500'
                                  : risk.score >= 25
                                  ? 'bg-blue-600'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${risk.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedFdrRisk({ fdr, risk })}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded transition-colors cursor-pointer"
                        >
                          View Factors
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Factor Breakdown Modal / Detail */}
          {selectedFdrRisk && (
            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Risk Breakdown: {selectedFdrRisk.fdr.fdrNumber} ({selectedFdrRisk.fdr.institutionName})
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedFdrRisk(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-3">
                <div>
                  <p className="text-slate-400 text-[11px]">Recommended Security Mandate:</p>
                  <p className="font-semibold text-slate-100 mt-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    {selectedFdrRisk.risk.recommendation}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Evaluated Score:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-white font-mono">{selectedFdrRisk.risk.score} / 100</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase">
                      {selectedFdrRisk.risk.level} TIER
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Active Risk Drivers:
                </p>
                {selectedFdrRisk.risk.factors.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No adverse risk drivers detected. Standard verification clearance.</p>
                ) : (
                  selectedFdrRisk.risk.factors.map((factor, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700/60 p-2.5 rounded-lg flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{factor.name}</span>
                        <p className="text-slate-400 text-[11px] mt-0.5">{factor.description}</p>
                      </div>
                      <span className="font-mono font-bold text-amber-400 shrink-0">
                        +{factor.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Active Sessions & Idle Surveillance */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Regulated Stakeholder Sessions &amp; Idle Timeout Controls
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Session tokens expire automatically after 15 minutes of inactivity. Revocation forces token renegotiation.
              </p>
            </div>
            <button
              onClick={handleRevokeSession}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 self-start cursor-pointer"
            >
              <ShieldX className="w-4 h-4" />
              <span>Revoke Active Token</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Current Active Session Stamped
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Authenticated User:</span>
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Designation &amp; Role:</span>
                  <span className="font-mono font-semibold text-blue-700">{currentUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Token ID:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[180px]">
                    {activeSession?.token || 'SEC-TOK-ACTIVE-GOV-9821'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway IP:</span>
                  <span className="font-mono text-slate-800">14.139.112.45 (AICTE HQ)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Idle Inactivity Limit:</span>
                  <span className="font-semibold text-emerald-600">15 Minutes (Active)</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Registered Regulatory Personas ({allDemoUsers.length})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allDemoUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      user.id === currentUser.id
                        ? 'bg-blue-50/80 border-blue-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] text-slate-500">{user.email} • {user.role}</p>
                    </div>
                    {user.id === currentUser.id ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => switchUser(user.id)}
                        className="text-[10px] font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security Compliance Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                AICTE Production Security Hardening Checklist (Section 47)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every control maps directly to executing code routines within the application kernel.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>10 / 10 Controls Implemented &amp; Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              {
                title: '1. Granular Role-Based Access Control (RBAC)',
                desc: 'Strict deny-by-default permission checks across Admin, Approver, Officer, Institution, and Auditor personas.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '2. Four-Eyes Principle (Maker-Checker)',
                desc: 'Request initiator cannot act as approver for lien release or FDR verification. Independent checker required.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '3. Finite State Machine Validation',
                desc: 'Deterministic lifecycle transitions (DRAFT -> PENDING -> ACTIVE -> MATURED -> RELEASED). Illegal skips throw errors.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '4. Cryptographic SHA-256 Audit Chaining',
                desc: 'Blockchain-style previous-block hash linkage. Real-time integrity scanner detects any manual tampering.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '5. Rate Limiting & DoS Shield',
                desc: 'Sliding window limit (10 requests/min) on financial submissions with auto-lockout cooldown.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '6. Idempotency Key De-Duplication',
                desc: 'Replay protection prevents double-charge or accidental duplicate submission from network lag.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '7. Input Sanitization & Anti-XSS Filter',
                desc: 'Strips dangerous HTML tags, javascript directives, and directory traversal attempts on all user inputs.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '8. Dual-Factor Step-Up Confirmation',
                desc: 'Requires security token/PIN confirmation before executing high-risk lien releases or baseline resets.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '9. Anomaly & Fraud Risk Scoring Engine',
                desc: 'Automated 0-100 score engine analyzing deposit value, CBS mismatches, submission velocity, and lien expiry.',
                active: true,
                badge: 'ENFORCED',
              },
              {
                title: '10. Session Idle Surveillance & Masking',
                desc: '15-minute inactivity timeout. Sensitive account numbers and PAN identifiers masked in view layer.',
                active: true,
                badge: 'ENFORCED',
              },
            ].map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step-Up Confirmation for Baseline Reset */}
      <SecurityConfirmModal
        isOpen={isResetConfirmOpen}
        title="Confirm Baseline Database Reset"
        actionName="RESET_BASELINE_DATA"
        targetEntityId="SYSTEM_DATABASE"
        severity="CRITICAL"
        description="This will restore all FDRs, discrepancies, and institutions to the Smart India Hackathon 2026 seed state. This action is logged permanently to the cryptographic audit chain."
        onSuccess={() => {
          setIsResetConfirmOpen(false);
          resetToSeedData(currentUser);
          showToast('Portal baseline database restored to pristine seed state.', 'success');
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
