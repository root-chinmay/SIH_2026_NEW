import React, { useState } from 'react';
import { Discrepancy, FDRRecord } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { saveDiscrepancy, saveFdr } from '../../services/storage';

interface DiscrepancyManagementProps {
  discrepancies: Discrepancy[];
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
  onRefreshData: () => void;
}

export const DiscrepancyManagement: React.FC<DiscrepancyManagementProps> = ({
  discrepancies,
  fdrs,
  onSelectFdr,
  onRefreshData,
}) => {
  const { currentUser, isInstitutionUser, canVerify } = useAuth();
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Clarification modal
  const [activeDisc, setActiveDisc] = useState<Discrepancy | null>(null);
  const [clarificationText, setClarificationText] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  // Filter scoped to institution if user is an institution
  const scopedDiscrepancies = discrepancies.filter((d) => {
    if (isInstitutionUser && currentUser.institutionId) {
      return d.institutionId === currentUser.institutionId;
    }
    return true;
  });

  const filtered = scopedDiscrepancies.filter((d) => {
    if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && d.severity !== filterSeverity) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchInst = d.institutionName.toLowerCase().includes(q);
      const matchFdr = d.fdrNumber.toLowerCase().includes(q);
      const matchId = d.id.toLowerCase().includes(q);
      const matchDesc = d.description.toLowerCase().includes(q);
      if (!matchInst && !matchFdr && !matchId && !matchDesc) return false;
    }
    return true;
  });

  const handleClarificationSubmit = () => {
    if (!activeDisc || !clarificationText.trim()) return;

    activeDisc.status = 'UNDER_REVIEW';
    activeDisc.institutionResponse = clarificationText;
    activeDisc.institutionResponseAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    saveDiscrepancy(activeDisc, currentUser);

    const fdr = fdrs.find((f) => f.id === activeDisc.fdrId);
    if (fdr) {
      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: `Institution Clarification Filed (${activeDisc.id})`,
        description: clarificationText,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: 'UNDER_REVIEW',
      });
      saveFdr(fdr, currentUser, 'DISCREPANCY_CLARIFICATION_SUBMITTED');
    }

    setActiveDisc(null);
    setClarificationText('');
    showToast('Clarification Dispatched', 'Clarification successfully dispatched for officer scrutiny.', 'success');
    onRefreshData();
  };

  const handleResolveSubmit = () => {
    if (!activeDisc || !resolutionText.trim()) return;

    activeDisc.status = 'RESOLVED';
    activeDisc.resolutionNotes = resolutionText;
    activeDisc.resolvedBy = currentUser.name;
    activeDisc.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    saveDiscrepancy(activeDisc, currentUser);

    const fdr = fdrs.find((f) => f.id === activeDisc.fdrId);
    if (fdr) {
      const remaining = fdr.discrepancies.filter((d) => d.id !== activeDisc.id && d.status !== 'RESOLVED' && d.status !== 'CLOSED');
      if (remaining.length === 0) {
        fdr.status = 'ACTIVE';
        fdr.verificationStatus = 'VERIFIED';
      }
      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: `Discrepancy Resolved (${activeDisc.id})`,
        description: resolutionText,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: fdr.status,
      });
      saveFdr(fdr, currentUser, 'DISCREPANCY_RESOLVED');
    }

    setActiveDisc(null);
    setResolutionText('');
    showToast('Discrepancy Resolved', 'Discrepancy marked as RESOLVED and FDR case updated.', 'success');
    onRefreshData();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Discrepancy Surveillance &amp; Resolution Desk</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {filtered.length} Discrepancies
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated and manual audit discrepancies detected across security deposits
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Institution, FDR No., or Discrepancy ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="AWAITING_INSTITUTION">Awaiting Institution</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Discrepancies List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-bold text-sm text-slate-800">No Discrepancies Found</p>
            <p className="text-xs text-slate-400 mt-1">All examined deposits satisfy regulatory validation rules.</p>
          </div>
        ) : (
          filtered.map((disc) => (
            <div
              key={disc.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-900">{disc.id}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    FDR: {disc.fdrNumber}
                  </span>
                  <StatusBadge status={disc.severity} size="sm" />
                  <span className="text-xs font-bold text-slate-800">{disc.type.replace('_', ' ')}</span>
                </div>
                <StatusBadge status={disc.status} size="sm" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-900">{disc.institutionName}</p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200/70">
                  {disc.description}
                </p>
              </div>

              {disc.institutionResponse && (
                <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-xs">
                  <p className="font-bold text-amber-900">Institution Clarification ({disc.institutionResponseAt}):</p>
                  <p className="text-amber-800 mt-0.5">{disc.institutionResponse}</p>
                </div>
              )}

              {disc.resolutionNotes && (
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-xs">
                  <p className="font-bold text-emerald-900">Resolved Notes ({disc.resolvedAt}):</p>
                  <p className="text-emerald-800 mt-0.5">{disc.resolutionNotes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Detected: {disc.detectedAt} ({disc.detectedBy})</span>
                  <span>Assigned Officer: {disc.assignedOfficer}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectFdr(disc.fdrId)}
                    className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View FDR</span>
                  </button>

                  {isInstitutionUser && disc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setActiveDisc(disc)}
                      className="px-3 py-1 rounded text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Respond
                    </button>
                  )}

                  {canVerify && disc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setActiveDisc(disc)}
                      className="px-3 py-1 rounded text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      Resolve Case
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Dialog for Clarification or Resolution */}
      {activeDisc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-lg w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {canVerify ? 'Mark Discrepancy as Resolved' : 'Submit Institutional Clarification'}
            </h3>
            <p className="text-xs text-slate-600">
              Discrepancy: {activeDisc.id} • {activeDisc.fdrNumber} ({activeDisc.institutionName})
            </p>

            {canVerify ? (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Documentary Verification &amp; Resolution Remarks:
                </label>
                <textarea
                  rows={4}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="State basis of resolution, e.g., verified supplementary FDR certificate issued by bank..."
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Clarification Statement &amp; Reference:
                </label>
                <textarea
                  rows={4}
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  placeholder="Explain why the discrepancy occurred and provide bank transaction reference numbers..."
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveDisc(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              {canVerify ? (
                <button
                  onClick={handleResolveSubmit}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-700 text-white rounded hover:bg-emerald-800"
                >
                  Confirm Resolution
                </button>
              ) : (
                <button
                  onClick={handleClarificationSubmit}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-700 text-white rounded hover:bg-blue-800"
                >
                  Submit Clarification
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
