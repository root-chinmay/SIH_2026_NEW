import React, { useState } from 'react';
import { FDRRecord, BankVerificationData } from '../../types';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  Server,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { formatIndianCurrency } from '../common/StatusBadge';
import { performMockBankVerification } from '../../services/bankVerificationService';
import { saveFdr, saveDiscrepancy, getSystemSettings, addNotification } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface BankVerificationModalProps {
  fdr: FDRRecord | null;
  isOpen?: boolean;
  onClose: () => void;
  onVerificationComplete?: (fdrId: string) => void;
  onSuccess?: () => void;
}

export const BankVerificationModal: React.FC<BankVerificationModalProps> = ({
  fdr,
  isOpen = true,
  onClose,
  onVerificationComplete,
  onSuccess,
}) => {
  const { currentUser, isInstitutionUser, canVerify, canApprove } = useAuth();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [verificationResult, setVerificationResult] = useState<BankVerificationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState<'NORMAL' | 'SIMULATE_MISMATCH' | 'SIMULATE_UNAVAILABLE'>('NORMAL');

  if (!isOpen || !fdr) return null;

  if (isInstitutionUser) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">Access Denied: RBAC Security Policy</h3>
            <p className="text-xs text-slate-600 mt-1">
              Institutions have submission and status inquiry privileges only. Core Banking Verification and document approval are strictly reserved for the AICTE Approving Authority and designated Scrutiny Officers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const handleExecuteVerification = async () => {
    setIsRunning(true);
    setCurrentStep(1);
    setVerificationResult(null);
    setErrorMessage(null);

    // Step 1: Connecting
    await new Promise((r) => setTimeout(r, 450));
    setCurrentStep(2);

    // Step 2: Querying CBS
    await new Promise((r) => setTimeout(r, 550));
    setCurrentStep(3);

    // Step 3: Cross matching
    const settings = {
      ...getSystemSettings(),
      bankApiMockMode: simulationMode,
    };

    const res = await performMockBankVerification(fdr, settings, currentUser.name);
    setCurrentStep(4);
    setIsRunning(false);

    if (res.status === 'VERIFIED' && res.data) {
      setVerificationResult(res.data);
      fdr.verificationStatus = 'VERIFIED';
      fdr.verifiedAt = res.data.verifiedAt;
      fdr.verifiedBy = currentUser.name;
      fdr.verificationData = res.data;

      const isApprover = canApprove;
      if (isApprover) {
        fdr.status = 'ACTIVE';
        fdr.approvedBy = `${currentUser.name} (Approving Authority)`;
        fdr.approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      } else {
        // Scrutiny Officer verifies, moves to UNDER_REVIEW awaiting Approving Authority signoff
        fdr.status = 'UNDER_REVIEW';
      }

      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: isApprover
          ? 'Statutory Approval & Bank CBS Verification'
          : 'Bank CBS Verification Completed (Maker Scrutiny)',
        description: isApprover
          ? `Approved and placed in ACTIVE custody by Approving Authority ${currentUser.name}. CBS Ref: ${res.data.cbsReferenceNumber}.`
          : `Verified by Scrutiny Officer ${currentUser.name}. CBS Ref: ${res.data.cbsReferenceNumber}. Forwarded to Approving Authority for final statutory signoff.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: fdr.status,
      });

      saveFdr(fdr, currentUser, 'VERIFICATION_SUCCESS', {
        prev: 'Status: PENDING_VERIFICATION',
        next: isApprover ? 'Status: ACTIVE (Approved by Approving Authority)' : 'Status: UNDER_REVIEW (Awaiting Approving Authority Signoff)',
      });

      addNotification({
        title: isApprover ? `FDR Approved into Custody: ${fdr.fdrNumber}` : `FDR Verified by Scrutiny: ${fdr.fdrNumber}`,
        message: isApprover
          ? `${fdr.institutionName} deposit of ₹${fdr.amount.toLocaleString('en-IN')} approved by Approving Authority.`
          : `${fdr.institutionName} deposit verified against CBS. Awaiting Approving Authority sanction order.`,
        targetRole: 'ALL',
        targetInstitutionId: fdr.institutionId,
        type: 'VERIFICATION_REQUIRED',
        severity: 'SUCCESS',
        relatedFdrId: fdr.id,
      });

      showToast(
        isApprover ? 'Statutory Approval Granted!' : 'CBS Verification Completed!',
        isApprover
          ? `Ref: ${res.data.cbsReferenceNumber} • Deposit placed in ACTIVE custody.`
          : `Ref: ${res.data.cbsReferenceNumber} • Forwarded to Approving Authority for final signoff.`,
        'success'
      );
      onVerificationComplete?.(fdr.id);
      window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
    } else if (res.status === 'MISMATCH' && res.data) {
      setVerificationResult(res.data);
      fdr.verificationStatus = 'MISMATCH';
      fdr.status = 'CORRECTION_REQUIRED';
      fdr.verificationData = res.data;

      const discId = `DISC-${Date.now().toString().slice(-4)}`;
      saveDiscrepancy(
        {
          id: discId,
          fdrId: fdr.id,
          fdrNumber: fdr.fdrNumber,
          institutionId: fdr.institutionId,
          institutionName: fdr.institutionName,
          type: 'AMOUNT_MISMATCH',
          severity: 'HIGH',
          description: res.data.notes || 'Core Banking parameter mismatch identified during scrutiny.',
          detectedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          detectedBy: 'BANK_CBS_API',
          status: 'OPEN',
          assignedOfficer: currentUser.name,
        },
        currentUser
      );

      saveFdr(fdr, currentUser, 'DISCREPANCY_RAISED');

      addNotification({
        title: `Discrepancy Detected via CBS: ${fdr.fdrNumber}`,
        message: `Amount mismatch found for ${fdr.institutionName}. Status shifted to CORRECTION_REQUIRED.`,
        targetRole: 'ALL',
        targetInstitutionId: fdr.institutionId,
        type: 'DISCREPANCY_DETECTED',
        severity: 'CRITICAL',
        relatedFdrId: fdr.id,
      });

      showToast(
        'Core Banking Mismatch Detected',
        'Deposit shifted to CORRECTION_REQUIRED and discrepancy logged.',
        'warning'
      );
      onVerificationComplete?.(fdr.id);
      window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
    } else {
      setErrorMessage(res.error || 'Bank Gateway was unable to authenticate this instrument.');
      showToast('Gateway Verification Notice', res.error || 'CBS Service Returned Notice', 'error');
    }
  };

  const handleFinishAndClose = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Execute Bank Verification (CBS / SFMS Gateway)
              </h3>
              <p className="text-xs text-slate-500">
                Independent real-time reconciliation with Scheduled Bank registers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Target FDR Info Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-slate-900">{fdr.fdrNumber}</span>
              <span className="font-bold text-blue-900 font-mono text-sm">
                {formatIndianCurrency(fdr.amount)}
              </span>
            </div>
            <p className="text-slate-700 font-medium">{fdr.institutionName}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Depository: <strong>{fdr.bankName}</strong></span>
              <span>Branch: <strong>{fdr.branchName || 'Main'}</strong></span>
              <span>Issue Date: <strong>{fdr.issueDate}</strong></span>
              <span>Maturity Date: <strong>{fdr.maturityDate}</strong></span>
            </div>
          </div>

          {/* Test Simulation Mode Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
              Gateway Simulation Mode (For Hackathon Demonstration):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'NORMAL', label: '100% Match', color: 'border-emerald-300 text-emerald-800' },
                { id: 'SIMULATE_MISMATCH', label: 'Simulate Mismatch', color: 'border-amber-300 text-amber-800' },
                { id: 'SIMULATE_UNAVAILABLE', label: 'Gateway Timeout', color: 'border-rose-300 text-rose-800' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSimulationMode(m.id as any)}
                  className={`p-2 rounded-lg border text-center font-bold text-xs transition-all ${
                    simulationMode === m.id
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Execution Progress Stepper */}
          {isRunning && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-700" />
                <span>Executing Bank Verification Protocol...</span>
              </div>
              <div className="space-y-1 text-[11px] text-blue-800 pl-6">
                <p className={currentStep >= 1 ? 'font-bold text-blue-950' : 'opacity-40'}>
                  1. Handshake with RBI SFMS Gateway &amp; Depository Server...
                </p>
                <p className={currentStep >= 2 ? 'font-bold text-blue-950' : 'opacity-40'}>
                  2. Retrieving Core Banking Register for Account &amp; IFSC...
                </p>
                <p className={currentStep >= 3 ? 'font-bold text-blue-950' : 'opacity-40'}>
                  3. Verifying Joint Lien Mandate in favor of Member Secretary, AICTE...
                </p>
                <p className={currentStep >= 4 ? 'font-bold text-blue-950' : 'opacity-40'}>
                  4. Parameter reconciliation &amp; digital stamp generation...
                </p>
              </div>
            </div>
          )}

          {/* Success Outcome View */}
          {verificationResult && verificationResult.verifiedStatus === 'VERIFIED' && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Core Banking System Verification Confirmed</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                All parameters (FDR number, depository bank, principal amount, maturity schedule, and AICTE joint lien) match the bank Core Banking Solution records.
              </p>
              <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-200 text-[11px] space-y-1 font-mono">
                <p><strong>CBS Transaction Ref: </strong>{verificationResult.cbsReferenceNumber}</p>
                <p><strong>Timestamp: </strong>{verificationResult.verifiedAt} IST</p>
                <p><strong>Audited By: </strong>{verificationResult.verifiedBy}</p>
              </div>
            </div>
          )}

          {/* Mismatch Outcome View */}
          {verificationResult && verificationResult.verifiedStatus === 'MISMATCH' && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Parameter Discrepancy Identified</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                {verificationResult.notes}
              </p>
              <p className="text-[11px] font-bold text-amber-800">
                Action Taken: Status updated to CORRECTION_REQUIRED. Formal discrepancy logged in Discrepancy Desk.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Verification Service Notice</p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            {verificationResult ? 'Close Inspector' : 'Cancel'}
          </button>

          {verificationResult ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExecuteVerification}
                disabled={isRunning}
                className="px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Re-Test Gateway
              </button>
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Acknowledge &amp; Update Record</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleExecuteVerification}
              disabled={isRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-blue-600"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>{isRunning ? 'Checking CBS Gateway...' : 'Execute Bank Verification (CBS)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
