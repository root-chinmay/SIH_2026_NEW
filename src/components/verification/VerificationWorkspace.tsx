import React, { useState } from 'react';
import { FDRRecord } from '../../types';
import { StatusBadge, formatIndianCurrency } from '../common/StatusBadge';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  ExternalLink,
  Search,
  Building2,
  AlertOctagon,
  RefreshCw,
  FileText,
  Server,
  Layers,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { performMockBankVerification } from '../../services/bankVerificationService';
import { saveFdr, saveDiscrepancy, getSystemSettings, addNotification } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import { FdrQrModal } from '../common/FdrQrModal';

interface VerificationWorkspaceProps {
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
  onRefreshList: () => void;
  onOpenBankVerification?: (fdr: FDRRecord) => void;
}

export const VerificationWorkspace: React.FC<VerificationWorkspaceProps> = ({
  fdrs,
  onSelectFdr,
  onRefreshList,
  onOpenBankVerification,
}) => {
  const { currentUser, canVerify } = useAuth();
  const { showToast } = useToast();
  const settings = getSystemSettings();
  const [selectedFdrId, setSelectedFdrId] = useState<string>(
    fdrs.find((f) => f.status === 'PENDING_VERIFICATION' || f.status === 'UNDER_REVIEW')?.id || fdrs[0]?.id || ''
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrModalFdr, setQrModalFdr] = useState<FDRRecord | null>(null);
  const [rejectionModal, setRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [observationNote, setObservationNote] = useState('');
  const [simulationMode, setSimulationMode] = useState<'NORMAL' | 'SIMULATE_MISMATCH' | 'SIMULATE_UNAVAILABLE'>('NORMAL');

  const pendingList = fdrs.filter(
    (f) => f.status === 'PENDING_VERIFICATION' || f.status === 'UNDER_REVIEW' || f.status === 'CORRECTION_REQUIRED'
  );

  const selectedFdr = fdrs.find((f) => f.id === selectedFdrId) || pendingList[0] || fdrs[0];

  const handleExecuteBankVerification = async () => {
    if (!selectedFdr) return;
    if (onOpenBankVerification) {
      onOpenBankVerification(selectedFdr);
      return;
    }
    setIsVerifying(true);

    const activeSettings = {
      ...settings,
      bankApiMockMode: simulationMode,
    };

    const result = await performMockBankVerification(selectedFdr, activeSettings, currentUser.name);
    setIsVerifying(false);

    if (result.status === 'VERIFIED' && result.data) {
      selectedFdr.verificationStatus = 'VERIFIED';
      selectedFdr.status = 'ACTIVE';
      selectedFdr.verifiedAt = result.data.verifiedAt;
      selectedFdr.verifiedBy = currentUser.name;
      selectedFdr.verificationData = result.data;
      selectedFdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: 'Bank CBS Verification & Regulatory Approval',
        description: `Verified by ${currentUser.name}. 100% Core Banking parameter match (Ref: ${result.data.cbsReferenceNumber}).`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: 'ACTIVE',
      });

      saveFdr(selectedFdr, currentUser, 'VERIFICATION_SUCCESS', {
        prev: 'Status: PENDING_VERIFICATION',
        next: 'Status: ACTIVE (Verified)',
      });

      addNotification({
        title: `FDR Verified & Approved (${selectedFdr.fdrNumber})`,
        message: `Security Deposit for ${selectedFdr.institutionName} has been verified against Bank records and approved into active custody.`,
        targetRole: 'ALL',
        targetInstitutionId: selectedFdr.institutionId,
        type: 'VERIFICATION_REQUIRED',
        severity: 'SUCCESS',
        relatedFdrId: selectedFdr.id,
      });

      showToast(
        'Deposit Verified via Core Banking System!',
        `Transaction Ref: ${result.data.cbsReferenceNumber} • Placed in ACTIVE custody.`,
        'success'
      );
      onRefreshList();
    } else if (result.status === 'MISMATCH' && result.data) {
      selectedFdr.verificationStatus = 'MISMATCH';
      selectedFdr.status = 'CORRECTION_REQUIRED';
      selectedFdr.verificationData = result.data;

      const discId = `DISC-${Date.now().toString().slice(-4)}`;
      saveDiscrepancy(
        {
          id: discId,
          fdrId: selectedFdr.id,
          fdrNumber: selectedFdr.fdrNumber,
          institutionId: selectedFdr.institutionId,
          institutionName: selectedFdr.institutionName,
          type: 'AMOUNT_MISMATCH',
          severity: 'HIGH',
          description: result.data.notes || 'Core Banking parameter mismatch identified during scrutiny.',
          detectedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          detectedBy: 'BANK_CBS_API',
          status: 'OPEN',
          assignedOfficer: currentUser.name,
        },
        currentUser
      );

      saveFdr(selectedFdr, currentUser, 'DISCREPANCY_RAISED');

      showToast(
        'Discrepancy Identified during CBS Cross-Check',
        result.data.notes || 'FDR shifted to CORRECTION_REQUIRED.',
        'warning'
      );
      onRefreshList();
    } else {
      showToast(
        'Bank Gateway Offline / Notice',
        result.error || 'Bank Gateway was unable to authenticate this instrument.',
        'error'
      );
    }
  };

  const handleReject = () => {
    if (!selectedFdr || !rejectionReason.trim()) {
      showToast('Mandatory Field Missing', 'Reason for rejection must be provided.', 'warning');
      return;
    }

    selectedFdr.status = 'REJECTED';
    selectedFdr.verificationStatus = 'REJECTED';
    selectedFdr.remarks = rejectionReason;

    selectedFdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'FDR Rejected by Scrutiny Desk',
      description: `Rejection recorded: ${rejectionReason}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'REJECTED',
    });

    saveFdr(selectedFdr, currentUser, 'FDR_REJECTED');
    setRejectionModal(false);
    setRejectionReason('');
    showToast('FDR Rejected', 'Submission formally rejected with statutory justification.', 'info');
    onRefreshList();
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <span>Official Scrutiny &amp; Verification Desk</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {pendingList.length} In Queue
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare submitted institutional data side-by-side with independent Core Banking Solution (CBS) records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Active Scrutiny Officer: <strong>{currentUser.name}</strong>
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Pending Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[650px]">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Scrutiny Queue ({pendingList.length})
            </h3>
            <span className="text-[10px] text-slate-500">Live Intake</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {pendingList.map((fdr) => (
              <button
                key={fdr.id}
                type="button"
                onClick={() => setSelectedFdrId(fdr.id)}
                className={`w-full text-left p-3.5 rounded-xl transition-all cursor-pointer ${
                  selectedFdr?.id === fdr.id
                    ? 'bg-blue-50 border-2 border-blue-600 shadow-2xs'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-xs text-slate-900 truncate">{fdr.fdrNumber}</span>
                  <StatusBadge status={fdr.status} size="sm" />
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1 mt-1">{fdr.institutionName}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>{fdr.bankName}</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {formatIndianCurrency(fdr.amount)}
                  </span>
                </div>
              </button>
            ))}

            {pendingList.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-bold">Scrutiny Queue Clear</p>
                <p className="text-[11px] text-slate-400 mt-1">No FDRs pending verification.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Side-by-Side Comparison Desk (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          {selectedFdr ? (
            <div className="space-y-5">
              {/* Active Selection Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 font-mono">
                      {selectedFdr.fdrNumber}
                    </h3>
                    <StatusBadge status={selectedFdr.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedFdr.institutionName} • Lodged: {selectedFdr.submittedAt}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectFdr(selectedFdr.id)}
                  className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Full Dossier</span>
                </button>
              </div>

              {/* Simulation Mode Toggle Pills */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Server className="w-4 h-4 text-blue-700" />
                  <span className="font-bold">CBS Gateway Response Simulation:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'NORMAL', label: '100% Match' },
                    { id: 'SIMULATE_MISMATCH', label: 'Simulate Deficit' },
                    { id: 'SIMULATE_UNAVAILABLE', label: 'Timeout' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSimulationMode(m.id as any)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        simulationMode === m.id
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Audit Parameter</th>
                      <th className="px-4 py-3">Institution Claimed Data</th>
                      <th className="px-4 py-3">Core Banking System (CBS) Data</th>
                      <th className="px-4 py-3 text-center">Cross-Check Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Field: FDR Number */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">FDR Receipt Number</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{selectedFdr.fdrNumber}</td>
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {selectedFdr.verificationData?.verifiedFdrNumber || selectedFdr.fdrNumber}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Match
                        </span>
                      </td>
                    </tr>

                    {/* Field: Bank Name */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Depository Bank</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{selectedFdr.bankName}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {selectedFdr.verificationData?.verifiedBank || selectedFdr.bankName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Match
                        </span>
                      </td>
                    </tr>

                    {/* Field: Principal Deposit Amount */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Principal Deposit Amount</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 tabular-nums">
                        {formatIndianCurrency(selectedFdr.amount)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 tabular-nums">
                        {selectedFdr.verificationData?.verifiedAmount
                          ? formatIndianCurrency(selectedFdr.verificationData.verifiedAmount)
                          : formatIndianCurrency(selectedFdr.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {selectedFdr.verificationData && !selectedFdr.verificationData.fieldMatches.amount ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Match
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Field: Issue Date */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Issue Date</td>
                      <td className="px-4 py-3 font-mono">{selectedFdr.issueDate}</td>
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {selectedFdr.verificationData?.verifiedIssueDate || selectedFdr.issueDate}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Match
                        </span>
                      </td>
                    </tr>

                    {/* Field: Maturity Date */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Maturity Date</td>
                      <td className="px-4 py-3 font-mono">{selectedFdr.maturityDate}</td>
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {selectedFdr.verificationData?.verifiedMaturityDate || selectedFdr.maturityDate}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Match
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Scrutiny Actions Toolbar with Dedicated Execute Bank Verification Button */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Official Regulatory Determination:
                  </h4>
                  {selectedFdr.verificationData?.cbsReferenceNumber && (
                    <span className="text-[11px] font-mono font-bold text-blue-900">
                      CBS Ref: {selectedFdr.verificationData.cbsReferenceNumber}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* TOP PRIORITY BUTTON: Execute Bank Verification (CBS) */}
                  <button
                    type="button"
                    onClick={handleExecuteBankVerification}
                    disabled={isVerifying}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-blue-600"
                    title="Click to execute real-time bank verification against Core Banking registers"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>
                      {isVerifying ? 'Connecting to Core Banking Gateway...' : 'Execute Bank Verification (CBS)'}
                    </span>
                  </button>

                  {/* QR Verification Seal Button */}
                  <button
                    type="button"
                    onClick={() => setQrModalFdr(selectedFdr)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-300"
                    title="Inspect Cryptographic QR Code and Live Status"
                  >
                    <QrCode className="w-4 h-4 text-blue-700" />
                    <span>QR Seal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectionModal(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Instrument</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-500">
              <p>Select an FDR from the queue to start scrutiny verification.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-300 max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-rose-950 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>Record Statutory Rejection</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Rejection (Mandatory under APH Guidelines):
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State specific deficiency, e.g., Drawn on non-scheduled institution or missing mandatory lien endorsement..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-1.5 text-xs font-bold bg-rose-700 text-white rounded-lg hover:bg-rose-800 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating QR Modal */}
      {qrModalFdr && (
        <FdrQrModal
          fdr={qrModalFdr}
          isOpen={!!qrModalFdr}
          onClose={() => setQrModalFdr(null)}
        />
      )}
    </div>
  );
};
