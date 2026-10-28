import React, { useState } from 'react';
import { FDRRecord } from '../../types';
import { StatusBadge, formatIndianCurrency } from '../common/StatusBadge';
import {
  Repeat,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers,
  History,
  Archive,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { saveFdr, addNotification } from '../../services/storage';

interface RenewalManagementProps {
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
  onRefreshData: () => void;
}

export const RenewalManagement: React.FC<RenewalManagementProps> = ({
  fdrs,
  onSelectFdr,
  onRefreshData,
}) => {
  const { currentUser, isInstitutionUser, canApprove, canVerify } = useAuth();
  const { showToast } = useToast();
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  // New renewal form state
  const [renewedNumber, setRenewedNumber] = useState('');
  const [renewedBank, setRenewedBank] = useState('State Bank of India');
  const [renewedAmount, setRenewedAmount] = useState<number>(1500000);
  const [renewedMaturity, setRenewedMaturity] = useState('2031-10-25');

  // Filter scoped to institution if user is an institution
  const scopedFdrs = React.useMemo(() => {
    if (isInstitutionUser && currentUser.institutionId) {
      return fdrs.filter((f) => f.institutionId === currentUser.institutionId);
    }
    return fdrs;
  }, [fdrs, isInstitutionUser, currentUser]);

  // Find FDRs with renewal relationships (either replaced, renewed, or awaiting renewal)
  const renewedPairs = scopedFdrs.filter((f) => f.renewalChain !== undefined);
  const candidatesForRenewal = scopedFdrs.filter((f) => ['EXPIRING_SOON', 'MATURED', 'OVERDUE', 'RENEWAL_PENDING'].includes(f.status));

  const handleInitiateRenewal = (fdr: FDRRecord) => {
    setSelectedParentId(fdr.id);
    setRenewedNumber(`${fdr.fdrNumber}-REN`);
    setRenewedBank(fdr.bankName);
    setRenewedAmount(fdr.amount);
    setShowRenewalModal(true);
  };

  const handleConfirmRenewal = () => {
    const parentFdr = fdrs.find((f) => f.id === selectedParentId);
    if (!parentFdr) return;

    if (!renewedNumber.trim()) {
      showToast('Validation Error', 'Renewal FDR Number is required.', 'warning');
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newFdrId = `FDR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const isAuthority = canApprove;

    // Create the child renewed FDR
    const newRecord: FDRRecord = {
      id: newFdrId,
      fdrNumber: renewedNumber.trim(),
      institutionId: parentFdr.institutionId,
      institutionName: parentFdr.institutionName,
      bankName: renewedBank,
      branchName: parentFdr.branchName,
      ifscCode: parentFdr.ifscCode,
      amount: renewedAmount,
      currency: 'INR',
      issueDate: now.slice(0, 10),
      maturityDate: renewedMaturity,
      validityPeriodMonths: 60,
      instrumentType: parentFdr.instrumentType,
      jointHolderName: parentFdr.jointHolderName,
      purpose: `Renewal rollover of predecessor deposit ${parentFdr.fdrNumber}`,
      status: isAuthority ? 'ACTIVE' : 'RENEWAL_PENDING',
      verificationStatus: isAuthority ? 'VERIFIED' : 'PENDING',
      submittedAt: now,
      submittedBy: `${currentUser.name} (${currentUser.role})`,
      verifiedAt: isAuthority ? now : undefined,
      verifiedBy: isAuthority ? `${currentUser.name} (Approving Authority)` : undefined,
      approvedAt: isAuthority ? now : undefined,
      approvedBy: isAuthority ? `${currentUser.name} (Approving Authority)` : undefined,
      renewalChain: {
        previousFdrId: parentFdr.id,
        previousFdrNumber: parentFdr.fdrNumber,
        renewalDate: now,
        renewalRemarks: isAuthority
          ? 'Statutory renewal executed by AICTE Approving Authority. Continuous lien active.'
          : 'Rollover renewal request submitted by Institution. Pending Approving Authority sanction.',
      },
      documents: parentFdr.documents || [],
      discrepancies: [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          title: isAuthority
            ? 'Rollover Renewal Approved & Placed in Custody'
            : 'Rollover Renewal Request Submitted by Institution',
          description: isAuthority
            ? `Successor instrument to ${parentFdr.fdrNumber} approved into active custody by ${currentUser.name}. Continuous unbroken lien active.`
            : `Submitted by ${currentUser.name}. Awaiting AICTE Approving Authority statutory sanction order.`,
          timestamp: now,
          performedBy: currentUser.name,
          role: currentUser.role,
          statusTag: isAuthority ? 'ACTIVE' : 'RENEWAL_PENDING',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    saveFdr(newRecord, currentUser, isAuthority ? 'RENEWAL_APPROVED' : 'RENEWAL_REQUEST_SUBMITTED');

    // Update parent FDR
    if (isAuthority) {
      parentFdr.status = 'REPLACED';
      parentFdr.renewalChain = {
        renewedFdrId: newRecord.id,
        renewedFdrNumber: newRecord.fdrNumber,
        renewalDate: now,
        renewalRemarks: `Superseded by renewal instrument ${newRecord.fdrNumber} approved by Approving Authority.`,
      };
      parentFdr.timeline.push({
        id: `tl-${Date.now() + 1}`,
        title: 'Instrument Marked REPLACED upon Renewal',
        description: `Predecessor instrument archived in superseded status. Successor FDR: ${newRecord.fdrNumber}. Approved by ${currentUser.name}.`,
        timestamp: now,
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: 'REPLACED',
      });
      saveFdr(parentFdr, currentUser, 'FDR_REPLACED');
    } else {
      parentFdr.status = 'RENEWAL_PENDING';
      parentFdr.timeline.push({
        id: `tl-${Date.now() + 1}`,
        title: 'Rollover Request Lodged by Institution',
        description: `Request for successor FDR ${newRecord.fdrNumber} lodged. Awaiting AICTE Approving Authority sanction.`,
        timestamp: now,
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: 'RENEWAL_PENDING',
      });
      saveFdr(parentFdr, currentUser, 'RENEWAL_REQUESTED');
    }

    addNotification({
      title: isAuthority
        ? `FDR Renewal Executed: ${newRecord.fdrNumber}`
        : `FDR Renewal Request Submitted: ${newRecord.fdrNumber}`,
      message: isAuthority
        ? `Rollover approved for ${parentFdr.institutionName}. Predecessor ${parentFdr.fdrNumber} marked REPLACED; new FDR is ACTIVE.`
        : `${parentFdr.institutionName} requested a rollover renewal for ${parentFdr.fdrNumber}. Awaiting Approving Authority sanction.`,
      targetRole: 'ALL',
      targetInstitutionId: parentFdr.institutionId,
      type: 'RENEWAL_APPROVED',
      severity: isAuthority ? 'SUCCESS' : 'INFO',
      relatedFdrId: newRecord.id,
    });

    setShowRenewalModal(false);
    showToast(
      isAuthority ? 'FDR Renewal Approved & Activated' : 'Rollover Request Lodged',
      isAuthority
        ? `Successor FDR ${newRecord.fdrNumber} approved and placed in ACTIVE custody.`
        : `Rollover request for ${parentFdr.fdrNumber} lodged. Awaiting Approving Authority sanction order.`,
      'success'
    );
    onRefreshData();
    window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-700" />
            <span>FDR Renewal &amp; Replacement Lineage Architecture</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict regulatory tracking of predecessor-successor instruments with unbroken lien continuity
          </p>
        </div>
      </div>

      {/* Active Lineage Chains */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
          Active Predecessor-Successor Renewal Chains ({renewedPairs.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renewedPairs.map((fdr) => (
            <div
              key={fdr.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-xs text-slate-900 line-clamp-1">{fdr.institutionName}</span>
                <StatusBadge status={fdr.status} size="sm" />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Predecessor FDR</span>
                  <span className="font-mono font-bold text-slate-800">
                    {fdr.renewalChain?.previousFdrNumber || fdr.fdrNumber}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Archived / Superseded</span>
                </div>

                <ArrowRight className="w-5 h-5 text-blue-600 shrink-0" />

                <div className="flex-1 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                  <span className="text-[10px] text-blue-700 block uppercase font-bold">Renewed Instrument</span>
                  <span className="font-mono font-bold text-blue-900">
                    {fdr.renewalChain?.renewedFdrNumber || fdr.fdrNumber}
                  </span>
                  <span className="text-[10px] text-blue-700 block mt-0.5">Active Custody</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                <p>
                  <strong>Deposit Amount: </strong>
                  <span className="font-mono font-bold">{formatIndianCurrency(fdr.amount)}</span>
                </p>
                <p>
                  <strong>Rollover Recorded: </strong>
                  <span>{fdr.renewalChain?.renewalDate || 'N/A'}</span>
                </p>
                <p className="line-clamp-2">
                  <strong>Continuity Undertaking: </strong>
                  <span>{fdr.renewalChain?.renewalRemarks}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => onSelectFdr(fdr.id)}
                  className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Lineage Record</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Eligible Deposits Awaiting Renewal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-6">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            Maturing Deposits Eligible for Renewal Rollover ({candidatesForRenewal.length})
          </h3>
          <p className="text-[11px] text-slate-500">
            Instruments requiring immediate replacement to maintain regulatory compliance
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">FDR Number</th>
                <th className="px-4 py-3">Institution Name</th>
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Maturity Date</th>
                <th className="px-4 py-3">Current Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidatesForRenewal.map((fdr) => (
                <tr key={fdr.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{fdr.fdrNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fdr.institutionName}</td>
                  <td className="px-4 py-3">{fdr.bankName}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{formatIndianCurrency(fdr.amount)}</td>
                  <td className="px-4 py-3 font-medium text-amber-800">{fdr.maturityDate}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={fdr.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleInitiateRenewal(fdr)}
                      className={`px-3 py-1 rounded font-bold text-xs shadow-2xs cursor-pointer ${
                        canApprove
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-blue-700 text-white hover:bg-blue-800'
                      }`}
                    >
                      {canApprove ? 'Sanction Rollover' : 'Request Rollover'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewal Rollover Submission Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-lg w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-blue-700" />
              <span>Lodge Successor FDR Rollover</span>
            </h3>

            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-900 space-y-1">
              <p>
                <strong>Predecessor FDR ID: </strong>
                <span className="font-mono">{selectedParentId}</span>
              </p>
              <p className="text-[11px] text-blue-700">
                Lien on the predecessor deposit will be transferred continuously to the successor instrument.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Renewal FDR Receipt Number *</label>
                <input
                  type="text"
                  value={renewedNumber}
                  onChange={(e) => setRenewedNumber(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={renewedBank}
                  onChange={(e) => setRenewedBank(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deposit Amount (INR)</label>
                <input
                  type="number"
                  value={renewedAmount}
                  onChange={(e) => setRenewedAmount(Number(e.target.value))}
                  className="w-full p-2 rounded border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">New Maturity Date</label>
                <input
                  type="date"
                  value={renewedMaturity}
                  onChange={(e) => setRenewedMaturity(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300"
                />
              </div>
            </div>

            {isInstitutionUser && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                <span className="font-bold">Institutional Submitter: </span>
                <span>Submitting this request queues the successor FDR for AICTE Approving Authority statutory sanction. Institutions cannot approve or activate deposits directly.</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRenewalModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRenewal}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded cursor-pointer ${
                  canApprove
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {canApprove ? 'Sanction Rollover & Activate' : 'Submit Rollover Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
