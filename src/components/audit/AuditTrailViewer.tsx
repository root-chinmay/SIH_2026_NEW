/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE FDR Portal - Cryptographic Regulatory Audit Register
 */

import React, { useState, useMemo, useEffect } from 'react';
import { AuditLogItem } from '../../types';
import { getAuditLogs, verifyStoredAuditIntegrity } from '../../services/auditService';
import {
  History,
  Search,
  Filter,
  Shield,
  UserCheck,
  FileText,
  Clock,
  Layers,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AuditTrailViewer: React.FC = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [chainStatus, setChainStatus] = useState<{
    isValid: boolean;
    totalVerified: number;
    message: string;
  } | null>(null);

  const loadLogs = () => {
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener('aicte_audit_updated', handleUpdate);
    return () => window.removeEventListener('aicte_audit_updated', handleUpdate);
  }, []);

  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyStoredAuditIntegrity();
      setChainStatus(result);
      setIsVerifying(false);
      if (result.isValid) {
        showToast(`Audit Ledger Integrity Verified: ${result.totalVerified} SHA-256 blocks validated.`, 'success');
      } else {
        showToast(`Integrity Check Failed: ${result.message}`, 'error');
      }
    }, 500);
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entity !== entityFilter) return false;
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchUser = log.userName.toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchEntityId = log.entityId.toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchDesc && !matchEntityId) return false;
      }
      return true;
    });
  }, [auditLogs, entityFilter, actionFilter, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-700" />
            <span>Cryptographic Regulatory Audit Register</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredLogs.length} Events
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable regulatory ledger tracking state transitions, logins, scrutiny determinations, and lien releases with SHA-256 block chaining.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Fingerprint className="w-4 h-4" />
            )}
            <span>Verify Hash Chain</span>
          </button>
        </div>
      </div>

      {/* Integrity banner if checked */}
      {chainStatus && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
          chainStatus.isValid
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {chainStatus.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{chainStatus.message}</span>
          </div>
          <span className="font-mono text-[10px] font-bold bg-white/80 border border-current px-2 py-0.5 rounded">
            CRYPTOGRAPHIC CHAIN: {chainStatus.isValid ? 'VERIFIED' : 'FAILED'}
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Actor Name, Action, Entity ID, or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All Entity Categories</option>
            <option value="FDR">FDR Instruments</option>
            <option value="VERIFICATION">Verification Desk</option>
            <option value="DISCREPANCY">Discrepancies</option>
            <option value="RELEASE">Lien Release</option>
            <option value="AUTH">Authentication Sessions</option>
            <option value="SECURITY">Security Kernel &amp; Blocks</option>
            <option value="SETTINGS">Administrative Settings</option>
          </select>
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All Action Classifications</option>
            <option value="LOGIN">LOGIN</option>
            <option value="FDR_SUBMISSION">FDR SUBMISSION</option>
            <option value="VERIFICATION_SUCCESS">VERIFICATION SUCCESS</option>
            <option value="DISCREPANCY_RAISED">DISCREPANCY RAISED</option>
            <option value="RELEASE_RECOMMENDED">RELEASE RECOMMENDED</option>
            <option value="RELEASE_SANCTIONED">RELEASE SANCTIONED</option>
            <option value="STEP_UP_AUTH_SUCCESS">STEP-UP AUTH SUCCESS</option>
            <option value="SECURITY_VIOLATION_BLOCKED">SECURITY VIOLATION BLOCKED</option>
            <option value="SETTINGS_CONFIGURED">SETTINGS CONFIGURED</option>
          </select>
        </div>
      </div>

      {/* Main Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Actor &amp; Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Audit Narrative &amp; Diff</th>
                <th className="px-4 py-3">Proof Hash</th>
                <th className="px-4 py-3">Gateway IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-slate-600">
                    {log.timestamp}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-slate-900 block">{log.userName}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                      {log.userRole}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-xs text-blue-900 whitespace-nowrap">
                    {log.action}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-800">{log.entity}</span>
                    <span className="block text-[10px] font-mono text-slate-400">{log.entityId}</span>
                  </td>

                  <td className="px-4 py-3 max-w-md">
                    <p className="text-slate-800 leading-relaxed font-medium">{log.description}</p>
                    {(log.previousValue || log.newValue) && (
                      <div className="mt-1 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200/70 font-mono space-y-0.5">
                        {log.previousValue && (
                          <div className="text-rose-700">- {log.previousValue}</div>
                        )}
                        {log.newValue && (
                          <div className="text-emerald-700">+ {log.newValue}</div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.hash ? (
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 max-w-[100px] truncate inline-block" title={log.hash}>
                        {log.hash.slice(0, 10)}...
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Genesis</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
