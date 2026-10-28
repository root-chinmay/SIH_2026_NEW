import React, { useState } from 'react';
import { FDRRecord, ReleaseRequest } from '../../types';
import { StatusBadge, formatIndianCurrency } from '../common/StatusBadge';
import {
  ArrowUpRightSquare,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Download,
  AlertCircle,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { saveFdr, addNotification } from '../../services/storage';
import { SecurityConfirmModal } from '../common/SecurityConfirmModal';
import { validateMakerChecker } from '../../services/securityService';

interface ReleaseRefundManagementProps {
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
  onRefreshData: () => void;
}

export const ReleaseRefundManagement: React.FC<ReleaseRefundManagementProps> = ({
  fdrs,
  onSelectFdr,
  onRefreshData,
}) => {
  const { currentUser, isInstitutionUser, canVerify, canApprove } = useAuth();
  const { showToast } = useToast();
  const [showNewPetitionModal, setShowNewPetitionModal] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestType, setRequestType] = useState<ReleaseRequest['requestType']>('FULL_RELEASE');

  // Officer recommendation state
  const [recommendationModal, setRecommendationModal] = useState(false);
  const [selectedReleaseFdr, setSelectedReleaseFdr] = useState<FDRRecord | null>(null);
  const [officerNotes, setOfficerNotes] = useState('');

  // Approver Sanction modal
  const [sanctionModal, setSanctionModal] = useState(false);
  const [sanctionNotes, setSanctionNotes] = useState('');
  const [isStepUpSanctionOpen, setIsStepUpSanctionOpen] = useState(false);

  // Collect all FDRs with release requests or released status
  const releaseRecords = fdrs.filter((f) => f.releaseRequest !== undefined || f.status === 'RELEASED');
  const eligibleForRelease = fdrs.filter((f) => ['ACTIVE', 'MATURED'].includes(f.status) && !f.releaseRequest);

  const handleCreatePetition = () => {
    const fdr = fdrs.find((f) => f.id === selectedFdrId);
    if (!fdr || !requestReason.trim()) {
      showToast('Validation Error', 'Please select an FDR and provide legal/statutory grounds for release.', 'error');
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const requestId = `REL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const releaseReq: ReleaseRequest = {
      id: requestId,
      fdrId: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      amount: fdr.amount,
      bankName: fdr.bankName,
      requestType,
      submissionDate: now,
      reason: requestReason,
      status: 'SUBMITTED',
      supportingDocuments: ['Resolution_of_Trust.pdf', 'Completion_Certificate.pdf'],
    };

    fdr.releaseRequest = releaseReq;
    fdr.status = 'RELEASE_REQUESTED';
    fdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'Formal Release & Refund Petition Lodged',
      description: `Petition ${requestId} lodged for ₹${fdr.amount.toLocaleString('en-IN')}/-. Reason: ${requestReason}`,
      timestamp: now,
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'RELEASE_REQUESTED',
    });

    saveFdr(fdr, currentUser, 'RELEASE_REQUEST_SUBMITTED');

    addNotification({
      title: `Release Petition Filed: ${requestId}`,
      message: `${fdr.institutionName} has submitted a petition for release of security deposit ${fdr.fdrNumber}.`,
      targetRole: 'OFFICER',
      type: 'RELEASE_REQUESTED',
      severity: 'INFO',
      relatedFdrId: fdr.id,
    });

    setShowNewPetitionModal(false);
    setRequestReason('');
    showToast('Petition Lodged', 'Release petition lodged successfully and queued for Scrutiny Officer assessment.', 'success');
    onRefreshData();
  };

  const handleOfficerRecommend = () => {
    if (!selectedReleaseFdr || !selectedReleaseFdr.releaseRequest || !officerNotes.trim()) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    selectedReleaseFdr.releaseRequest.status = 'RECOMMENDED_FOR_APPROVAL';
    selectedReleaseFdr.releaseRequest.officerObservations = officerNotes;
    selectedReleaseFdr.releaseRequest.officerName = currentUser.name;
    selectedReleaseFdr.releaseRequest.officerActionDate = now;

    selectedReleaseFdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'Scrutiny Officer Recommended Release to Competent Authority',
      description: `Officer assessment: ${officerNotes}`,
      timestamp: now,
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'UNDER_SCRUTINY',
    });

    saveFdr(selectedReleaseFdr, currentUser, 'RELEASE_RECOMMENDED');

    addNotification({
      title: `Release Awaiting Sanction: ${selectedReleaseFdr.releaseRequest.id}`,
      message: `Scrutiny Officer has recommended release of deposit for ${selectedReleaseFdr.institutionName}. Awaiting Competent Authority sanction.`,
      targetRole: 'APPROVER',
      type: 'RELEASE_REQUESTED',
      severity: 'WARNING',
      relatedFdrId: selectedReleaseFdr.id,
    });

    setRecommendationModal(false);
    setOfficerNotes('');
    showToast('Recommendation Submitted', 'Release recommendation forwarded to Approving Authority.', 'info');
    onRefreshData();
  };

  const handleApproverSanction = () => {
    if (!selectedReleaseFdr || !selectedReleaseFdr.releaseRequest) return;

    // Maker-Checker Check: Approver cannot be the same person who recommended release
    if (selectedReleaseFdr.releaseRequest.officerName === currentUser.name) {
      showToast(
        'Maker-Checker Violation',
        'You recommended this release as Scrutiny Officer. AICTE statutory mandate requires independent Competent Authority sanction.',
        'error'
      );
      return;
    }

    // Trigger step-up multi-factor authorization modal
    setIsStepUpSanctionOpen(true);
  };

  const executeSanctionOrder = () => {
    if (!selectedReleaseFdr || !selectedReleaseFdr.releaseRequest) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const orderNo = `AICTE/RB/REL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    selectedReleaseFdr.releaseRequest.status = 'RELEASED';
    selectedReleaseFdr.status = 'RELEASED';
    selectedReleaseFdr.releaseRequest.sanctionOrderNumber = orderNo;
    selectedReleaseFdr.releaseRequest.approverName = currentUser.name;
    selectedReleaseFdr.releaseRequest.approverRemarks = sanctionNotes || 'Sanction accorded under Clause 7.12 of APH.';
    selectedReleaseFdr.releaseRequest.approvalDate = now;

    selectedReleaseFdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'Sanction Order Issued & Lien Discharged (MFA Cleared)',
      description: `Official Sanction Order ${orderNo} signed with cryptographic key by ${currentUser.name}. Joint lien discharged.`,
      timestamp: now,
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'RELEASED',
    });

    try {
      saveFdr(selectedReleaseFdr, currentUser, 'RELEASE_SANCTIONED');

      addNotification({
        title: `Lien Discharged & Sanction Order Issued (${orderNo})`,
        message: `Security Deposit for ${selectedReleaseFdr.institutionName} has been officially released. Sanction Order dispatched.`,
        targetRole: 'ALL',
        targetInstitutionId: selectedReleaseFdr.institutionId,
        type: 'RELEASE_APPROVED',
        severity: 'SUCCESS',
        relatedFdrId: selectedReleaseFdr.id,
      });

      setSanctionModal(false);
      setIsStepUpSanctionOpen(false);
      setSanctionNotes('');
      showToast('Lien Discharged', `Formal Sanction Order ${orderNo} issued! Lien officially discharged.`, 'success');
      onRefreshData();
    } catch (err: any) {
      showToast('Security Kernel Rejection', err.message || 'Operation failed', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowUpRightSquare className="w-5 h-5 text-purple-700" />
            <span>Security Deposit Release &amp; Refund Mandate Workflow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end statutory governance: Submission &rarr; Scrutiny Check &rarr; Officer Recommendation &rarr; Approving Authority Sanction Order
          </p>
        </div>

        {isInstitutionUser && (
          <button
            onClick={() => {
              if (eligibleForRelease.length === 0) {
                showToast('No Eligible FDRs', 'No matured or active FDRs currently eligible for release.', 'info');
                return;
              }
              setSelectedFdrId(eligibleForRelease[0].id);
              setShowNewPetitionModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 transition-colors shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lodge Release Petition</span>
          </button>
        )}
      </div>

      {/* Release Records List */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
          Active Release &amp; Refund Petitions ({releaseRecords.length})
        </h3>

        <div className="space-y-3">
          {releaseRecords.map((fdr) => {
            const req = fdr.releaseRequest;
            if (!req) return null;

            return (
              <div
                key={fdr.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900">{req.id}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      FDR: {req.fdrNumber}
                    </span>
                    <span className="font-mono font-extrabold text-blue-900 text-xs">
                      {formatIndianCurrency(req.amount)}
                    </span>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">{req.institutionName}</p>
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded border border-slate-200/70">
                    <strong>Statutory Grounds: </strong>
                    {req.reason}
                  </p>
                </div>

                {req.officerObservations && (
                  <div className="p-2.5 bg-blue-50 rounded border border-blue-200 text-xs text-blue-900">
                    <p className="font-bold">Officer Recommendation ({req.officerName} - {req.officerActionDate}):</p>
                    <p className="mt-0.5">{req.officerObservations}</p>
                  </div>
                )}

                {req.sanctionOrderNumber && (
                  <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <div>
                      <p className="font-bold">Sanction Order Dispatched:</p>
                      <p className="font-mono font-bold mt-0.5">{req.sanctionOrderNumber}</p>
                      <p className="text-[11px] text-emerald-800">{req.approverRemarks}</p>
                    </div>
                    <button
                      onClick={() => showToast('Download Initiated', `Downloading cryptographically signed copy of Sanction Order: ${req.sanctionOrderNumber}`, 'info')}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-700 text-white rounded hover:bg-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Sanction Order</span>
                    </button>
                  </div>
                )}

                {/* Workflow Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>Filed on: {req.submissionDate} • Bank: {req.bankName}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectFdr(fdr.id)}
                      className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Inspect FDR</span>
                    </button>

                    {/* Scrutiny Officer Action */}
                    {canVerify && req.status === 'SUBMITTED' && (
                      <button
                        onClick={() => {
                          setSelectedReleaseFdr(fdr);
                          setRecommendationModal(true);
                        }}
                        className="px-3 py-1 rounded text-xs font-bold bg-blue-700 text-white hover:bg-blue-800"
                      >
                        Scrutinize &amp; Recommend
                      </button>
                    )}

                    {/* Approving Authority Action */}
                    {canApprove && req.status === 'RECOMMENDED_FOR_APPROVAL' && (
                      <button
                        onClick={() => {
                          setSelectedReleaseFdr(fdr);
                          setSanctionModal(true);
                        }}
                        className="px-3.5 py-1 rounded text-xs font-bold bg-purple-700 text-white hover:bg-purple-800"
                      >
                        Accord Formal Sanction
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Release Petition Modal */}
      {showNewPetitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-lg w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ArrowUpRightSquare className="w-5 h-5 text-purple-700" />
              <span>Lodge Release &amp; Refund Petition</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Security Deposit FDR *</label>
                <select
                  value={selectedFdrId}
                  onChange={(e) => setSelectedFdrId(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 font-mono"
                >
                  {eligibleForRelease.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fdrNumber} ({f.bankName}) - {formatIndianCurrency(f.amount)} (Matures: {f.maturityDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Petition Release Category</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="w-full p-2 rounded border border-slate-300"
                >
                  <option value="FULL_RELEASE">Full Release upon 10-Year Statutory Completion</option>
                  <option value="REFUND_ON_CLOSURE">Refund upon Formal Course / Institution Closure</option>
                  <option value="PARTIAL_RELEASE">Partial Release upon Program Rationalization</option>
                  <option value="SUBSTITUTION_RELEASE">Substitution by Alternate Bank Guarantee</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Institutional Grounds &amp; Compliance Statement *
                </label>
                <textarea
                  rows={4}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Detail completion of lock-in period, NBA accreditation, absence of vigilance complaints..."
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowNewPetitionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePetition}
                className="px-4 py-1.5 text-xs font-bold bg-purple-700 text-white rounded hover:bg-purple-800"
              >
                Submit Release Petition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Officer Recommendation Modal */}
      {recommendationModal && selectedReleaseFdr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-lg w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-blue-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <span>Scrutiny Officer Release Recommendation</span>
            </h3>

            <p className="text-xs text-slate-600">
              Institution: <strong>{selectedReleaseFdr.institutionName}</strong> • FDR: {selectedReleaseFdr.fdrNumber}
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Scrutiny Observations &amp; Regulatory Recommendation:
              </label>
              <textarea
                rows={4}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Confirm verification of NBA accreditation status, absence of penalties, and recommendation to Advisor (Approvals)..."
                className="w-full text-xs p-2 rounded border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRecommendationModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleOfficerRecommend}
                className="px-4 py-1.5 text-xs font-bold bg-blue-700 text-white rounded hover:bg-blue-800"
              >
                Forward Recommendation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approver Sanction Order Modal */}
      {sanctionModal && selectedReleaseFdr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-lg w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-700" />
              <span>Accord Competent Authority Sanction</span>
            </h3>

            <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-900 space-y-1">
              <p><strong>Institution: </strong>{selectedReleaseFdr.institutionName}</p>
              <p><strong>FDR Amount: </strong>{formatIndianCurrency(selectedReleaseFdr.amount)}</p>
              <p><strong>Officer Verification: </strong>{selectedReleaseFdr.releaseRequest?.officerObservations}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sanction Remarks &amp; Direction to Bank:</label>
              <textarea
                rows={3}
                value={sanctionNotes}
                onChange={(e) => setSanctionNotes(e.target.value)}
                placeholder="Lien is unconditionally discharged. Principal with accrued interest shall be refunded to the institution account..."
                className="w-full text-xs p-2 rounded border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSanctionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleApproverSanction}
                className="px-4 py-1.5 text-xs font-bold bg-purple-700 text-white rounded hover:bg-purple-800"
              >
                Issue Sanction Order &amp; Discharge Lien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-Up MFA Authorization for Release Sanction */}
      {selectedReleaseFdr && (
        <SecurityConfirmModal
          isOpen={isStepUpSanctionOpen}
          title="Sanction Security Deposit Release"
          actionName="SANCTION_RELEASE_ORDER"
          targetEntityId={selectedReleaseFdr.id}
          severity="CRITICAL"
          description={`You are about to issue statutory Lien Discharge Sanction Order for ${selectedReleaseFdr.institutionName} in the amount of ₹${(selectedReleaseFdr.amount / 100000).toFixed(2)} Lakhs. This action will irrevocably release AICTE lien on the underlying bank deposit.`}
          onSuccess={executeSanctionOrder}
          onCancel={() => setIsStepUpSanctionOpen(false)}
        />
      )}
    </div>
  );
};
