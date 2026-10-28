import React, { useState } from 'react';
import { FDRRecord, FDRDocument, Discrepancy } from '../../types';
import { StatusBadge, formatIndianCurrency, formatLakhs } from '../common/StatusBadge';
import {
  X,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Repeat,
  ArrowUpRightSquare,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Download,
  Upload,
  ExternalLink,
  Building2,
  AlertOctagon,
  Calendar,
  Layers,
  QrCode,
  ShieldAlert,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { performMockBankVerification } from '../../services/bankVerificationService';
import { saveFdr, saveDiscrepancy, getSystemSettings, addNotification, getFdrs } from '../../services/storage';
import { performDocumentForensics } from '../../services/securityService';
import { FdrQrModal } from '../common/FdrQrModal';

interface FdrDetailModalProps {
  fdr: FDRRecord | null;
  onClose: () => void;
  onRefreshFdr: (fdrId: string) => void;
  onOpenBankVerification?: (fdr: FDRRecord) => void;
}

export const FdrDetailModal: React.FC<FdrDetailModalProps> = ({
  fdr,
  onClose,
  onRefreshFdr,
  onOpenBankVerification,
}) => {
  const { currentUser, canVerify, canApprove, isInstitutionUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'verification' | 'forensics' | 'discrepancies' | 'renewals' | 'release' | 'timeline'>('overview');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<FDRDocument | null>(null);

  // Institution Discrepancy response state
  const [discrepancyResponse, setDiscrepancyResponse] = useState('');
  const [activeDiscrepancyId, setActiveDiscrepancyId] = useState<string | null>(null);

  // Approving Authority Sanction State
  const [showApproverModal, setShowApproverModal] = useState(false);
  const [sanctionOrderNo, setSanctionOrderNo] = useState(`AICTE/APH/2026/SANCTION-${fdr?.fdrNumber.replace(/[^a-zA-Z0-9]/g, '') || '001'}`);
  const [approverNotes, setApproverNotes] = useState('');

  if (!fdr) return null;

  // Approving Authority Statutory Signoff
  const handleGrantStatutoryApproval = () => {
    if (!canApprove) {
      showToast('Unauthorized Action', 'Only the AICTE Approving Authority can grant statutory approval.', 'error');
      return;
    }

    fdr.status = 'ACTIVE';
    fdr.verificationStatus = 'VERIFIED';
    fdr.approvedBy = `${currentUser.name} (${currentUser.designation})`;
    fdr.approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Also mark all documents as approved by Approving Authority
    if (fdr.documents) {
      fdr.documents = fdr.documents.map((d) => ({
        ...d,
        approvalStatus: 'APPROVED' as const,
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        approvalRemarks: `Statutory sanction granted under Order ${sanctionOrderNo}`,
      }));
    }

    fdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'Statutory Approval Granted (Approving Authority)',
      description: `Official Sanction Order ${sanctionOrderNo} executed by ${currentUser.name} (${currentUser.designation}). Security deposit activated into sovereign custody. Remarks: ${approverNotes || 'Found conforming to AICTE Approval Process Handbook (APH) regulations.'}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'ACTIVE',
    });

    saveFdr(fdr, currentUser, 'STATUTORY_APPROVAL_GRANTED', {
      prev: `Status: ${fdr.status}`,
      next: `Status: ACTIVE (Sanction: ${sanctionOrderNo})`,
    });

    addNotification({
      title: `Statutory Approval Granted: ${fdr.fdrNumber}`,
      message: `The Approving Authority has signed off on the security deposit for ${fdr.institutionName}. Instrument placed in ACTIVE custody.`,
      targetRole: 'ALL',
      targetInstitutionId: fdr.institutionId,
      type: 'VERIFICATION_REQUIRED',
      severity: 'SUCCESS',
      relatedFdrId: fdr.id,
    });

    setShowApproverModal(false);
    showToast(
      'Statutory Approval Granted!',
      `FDR ${fdr.fdrNumber} has been officially approved into active custody by ${currentUser.name}.`,
      'success'
    );
    onRefreshFdr(fdr.id);
    window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
  };

  // Individual Document Approval by Approving Authority
  const handleApproveDocument = (docId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    if (!canApprove) {
      showToast('Permission Denied', 'Document approval is strictly restricted to the AICTE Approving Authority. Institutions and Scrutiny Officers cannot approve documents.', 'error');
      return;
    }

    const targetDoc = fdr.documents?.find((d) => d.id === docId);
    if (!targetDoc) return;

    targetDoc.approvalStatus = newStatus;
    targetDoc.approvedBy = currentUser.name;
    targetDoc.approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    targetDoc.approvalRemarks = newStatus === 'APPROVED' ? 'Approved by Approving Authority after regulatory scrutiny.' : 'Rejected by Approving Authority: requires re-issuance from depository bank.';

    fdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: newStatus === 'APPROVED' ? `Document Approved: ${targetDoc.title}` : `Document Rejected: ${targetDoc.title}`,
      description: `Action executed by Approving Authority ${currentUser.name}. Status: ${newStatus}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: fdr.status,
    });

    saveFdr(fdr, currentUser, 'DOCUMENT_APPROVAL_CHANGED');

    showToast(
      newStatus === 'APPROVED' ? 'Document Approved' : 'Document Rejected',
      `"${targetDoc.title}" marked as ${newStatus} by Approving Authority.`,
      newStatus === 'APPROVED' ? 'success' : 'warning'
    );
    onRefreshFdr(fdr.id);
    window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
  };

  // Handle Bank CBS Verification
  const handlePerformVerification = async () => {
    if (isInstitutionUser) {
      showToast('Access Denied', 'Institutions cannot execute Core Banking verification.', 'error');
      return;
    }

    setIsVerifying(true);
    const settings = getSystemSettings();
    const result = await performMockBankVerification(fdr, settings, currentUser.name);
    setIsVerifying(false);

    if (result.status === 'VERIFIED' && result.data) {
      fdr.verificationStatus = 'VERIFIED';
      fdr.verifiedAt = result.data.verifiedAt;
      fdr.verifiedBy = currentUser.name;
      fdr.verificationData = result.data;

      const isApprover = canApprove;
      if (isApprover) {
        fdr.status = 'ACTIVE';
        fdr.approvedBy = `${currentUser.name} (Approving Authority)`;
        fdr.approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      } else {
        fdr.status = 'UNDER_REVIEW';
      }

      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: isApprover ? 'Bank CBS Verification & Statutory Approval' : 'Bank CBS Verification Completed (Maker Scrutiny)',
        description: isApprover
          ? `Approved and placed in ACTIVE custody by Approving Authority ${currentUser.name}. Core Banking Ref: ${result.data.cbsReferenceNumber}.`
          : `Verified by Scrutiny Officer ${currentUser.name}. CBS Ref: ${result.data.cbsReferenceNumber}. Recommended and forwarded to Approving Authority.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: fdr.status,
      });

      saveFdr(fdr, currentUser, 'VERIFICATION_SUCCESS', {
        prev: 'Status: PENDING_VERIFICATION',
        next: isApprover ? 'Status: ACTIVE (Approved)' : 'Status: UNDER_REVIEW (Awaiting Approver)',
      });

      addNotification({
        title: isApprover ? `FDR Verified & Approved (${fdr.fdrNumber})` : `FDR Verified via CBS (${fdr.fdrNumber})`,
        message: isApprover
          ? `Security Deposit for ${fdr.institutionName} verified and approved into active custody by Approving Authority.`
          : `Deposit for ${fdr.institutionName} verified against CBS by Scrutiny Officer. Awaiting Approving Authority signoff.`,
        targetRole: 'ALL',
        targetInstitutionId: fdr.institutionId,
        type: 'VERIFICATION_REQUIRED',
        severity: 'SUCCESS',
        relatedFdrId: fdr.id,
      });

      showToast(
        isApprover ? 'Deposit Verified & Approved!' : 'Deposit Verified via Core Banking!',
        isApprover
          ? `Transaction Ref: ${result.data.cbsReferenceNumber} • FDR placed in ACTIVE custody.`
          : `Transaction Ref: ${result.data.cbsReferenceNumber} • Forwarded to Approving Authority for signoff.`,
        'success'
      );
      onRefreshFdr(fdr.id);
      window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
    } else if (result.status === 'MISMATCH' && result.data) {
      fdr.verificationStatus = 'MISMATCH';
      fdr.status = 'CORRECTION_REQUIRED';
      fdr.verificationData = result.data;

      // Raise discrepancy
      const discId = `DISC-${Date.now().toString().slice(-4)}`;
      const newDisc: Discrepancy = {
        id: discId,
        fdrId: fdr.id,
        fdrNumber: fdr.fdrNumber,
        institutionId: fdr.institutionId,
        institutionName: fdr.institutionName,
        type: 'AMOUNT_MISMATCH',
        severity: 'HIGH',
        description: result.data.notes || 'Core Banking parameter mismatch identified during scrutiny.',
        detectedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        detectedBy: 'BANK_CBS_API',
        status: 'OPEN',
        assignedOfficer: currentUser.name,
      };

      fdr.discrepancies.push(newDisc);
      saveDiscrepancy(newDisc, currentUser);

      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: 'Core Banking Parameter Mismatch Raised',
        description: `Discrepancy ${discId} recorded: ${result.data.notes}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: 'CORRECTION_REQUIRED',
      });

      saveFdr(fdr, currentUser, 'DISCREPANCY_RAISED', {
        prev: 'Status: PENDING_VERIFICATION',
        next: 'Status: CORRECTION_REQUIRED',
      });

      addNotification({
        title: `Discrepancy Raised: ${fdr.fdrNumber}`,
        message: `Bank CBS verification identified a discrepancy in FDR for ${fdr.institutionName}. Status changed to CORRECTION_REQUIRED.`,
        targetRole: 'ALL',
        targetInstitutionId: fdr.institutionId,
        type: 'DISCREPANCY_DETECTED',
        severity: 'CRITICAL',
        relatedFdrId: fdr.id,
      });

      showToast(
        'Discrepancy Detected',
        'FDR status changed to CORRECTION_REQUIRED and discrepancy logged.',
        'warning'
      );
      onRefreshFdr(fdr.id);
    } else {
      showToast(
        'Verification Gateway Notice',
        result.error || 'Bank Gateway responded with service notice.',
        'error'
      );
    }
  };

  // Rejection
  const handleRejectFdr = () => {
    if (!rejectionReason.trim()) {
      showToast('Mandatory Field Missing', 'Reason for rejection must be documented.', 'warning');
      return;
    }

    fdr.status = 'REJECTED';
    fdr.verificationStatus = 'REJECTED';
    fdr.remarks = rejectionReason;
    fdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'FDR Rejected by Scrutiny Authority',
      description: `Rejection recorded: ${rejectionReason}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'REJECTED',
    });

    saveFdr(fdr, currentUser, 'FDR_REJECTED', {
      prev: 'Status: PENDING_VERIFICATION',
      next: `Status: REJECTED (${rejectionReason})`,
    });

    addNotification({
      title: `FDR Submission Rejected (${fdr.fdrNumber})`,
      message: `FDR submission from ${fdr.institutionName} was rejected. Reason: ${rejectionReason}`,
      targetRole: 'ALL',
      targetInstitutionId: fdr.institutionId,
      type: 'CORRECTION_REQUIRED',
      severity: 'CRITICAL',
      relatedFdrId: fdr.id,
    });

    setShowRejectForm(false);
    showToast('FDR Rejected', 'Audit trail and regulatory rejection recorded.', 'info');
    onRefreshFdr(fdr.id);
  };

  // Correction Request
  const handleRequestCorrection = () => {
    if (!correctionNote.trim()) {
      showToast('Mandatory Field Missing', 'Please explain the corrections requested from the institution.', 'warning');
      return;
    }

    fdr.status = 'CORRECTION_REQUIRED';
    fdr.verificationStatus = 'CORRECTION_REQUESTED';
    fdr.timeline.push({
      id: `tl-${Date.now()}`,
      title: 'Correction Requested from Institution',
      description: `Observation: ${correctionNote}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      performedBy: currentUser.name,
      role: currentUser.role,
      statusTag: 'CORRECTION_REQUIRED',
    });

    saveFdr(fdr, currentUser, 'CORRECTION_REQUESTED', {
      prev: 'Status: PENDING_VERIFICATION',
      next: 'Status: CORRECTION_REQUIRED',
    });

    addNotification({
      title: `Correction Required: ${fdr.fdrNumber}`,
      message: `AICTE Scrutiny Officer has requested corrections for ${fdr.institutionName}. Note: ${correctionNote}`,
      targetRole: 'ALL',
      targetInstitutionId: fdr.institutionId,
      type: 'CORRECTION_REQUIRED',
      severity: 'WARNING',
      relatedFdrId: fdr.id,
    });

    setShowCorrectionForm(false);
    showToast('Correction Dispatched', 'Formal notice sent to the institution.', 'info');
    onRefreshFdr(fdr.id);
  };

  // Institution submitting clarification for discrepancy
  const handleSubmitDiscrepancyClarification = (discId: string) => {
    if (!discrepancyResponse.trim()) {
      showToast('Mandatory Field Missing', 'Please enter your clarification explanation.', 'warning');
      return;
    }

    const disc = fdr.discrepancies.find((d) => d.id === discId);
    if (disc) {
      disc.status = 'UNDER_REVIEW';
      disc.institutionResponse = discrepancyResponse;
      disc.institutionResponseAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      saveDiscrepancy(disc, currentUser);

      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: `Institution Clarification Submitted (${disc.id})`,
        description: `Response: ${discrepancyResponse}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: 'UNDER_REVIEW',
      });
      saveFdr(fdr, currentUser, 'DISCREPANCY_CLARIFICATION_SUBMITTED');

      setDiscrepancyResponse('');
      setActiveDiscrepancyId(null);
      showToast('Clarification Lodged', 'Discrepancy response submitted for scrutiny review.', 'success');
      onRefreshFdr(fdr.id);
    }
  };

  // Officer resolving discrepancy
  const handleResolveDiscrepancy = (discId: string) => {
    const disc = fdr.discrepancies.find((d) => d.id === discId);
    if (disc) {
      disc.status = 'RESOLVED';
      disc.resolutionNotes = `Resolved and accepted by ${currentUser.name}. Satisfactory supplementary bank documents verified.`;
      disc.resolvedBy = currentUser.name;
      disc.resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      saveDiscrepancy(disc, currentUser);

      // Check if all discrepancies resolved
      const remainingOpen = fdr.discrepancies.filter((d) => d.id !== discId && d.status !== 'RESOLVED' && d.status !== 'CLOSED');
      if (remainingOpen.length === 0) {
        fdr.status = 'ACTIVE';
        fdr.verificationStatus = 'VERIFIED';
      }

      fdr.timeline.push({
        id: `tl-${Date.now()}`,
        title: `Discrepancy Resolved (${disc.id})`,
        description: disc.resolutionNotes,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: currentUser.name,
        role: currentUser.role,
        statusTag: fdr.status,
      });
      saveFdr(fdr, currentUser, 'DISCREPANCY_RESOLVED');

      showToast('Discrepancy Resolved', `Item marked as RESOLVED by ${currentUser.name}.`, 'success');
      onRefreshFdr(fdr.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 truncate">
                  FDR Record: {fdr.fdrNumber}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {fdr.id}
                </span>
                <StatusBadge status={fdr.status} size="sm" />
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                {fdr.institutionName} • Bank: {fdr.bankName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unique QR Verification Inspector Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors shadow-2xs cursor-pointer focus:ring-2 focus:ring-slate-400"
              title="Inspect Unique Cryptographic QR Code and Live Status Certificate"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-700" />
              <span>QR Seal</span>
            </button>

            {/* Approving Authority Exclusive Action: Grant Statutory Approval */}
            {canApprove && (fdr.status === 'PENDING_VERIFICATION' || fdr.status === 'UNDER_REVIEW' || fdr.status === 'SUBMITTED') && (
              <button
                type="button"
                onClick={() => setShowApproverModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md transition-all cursor-pointer ring-2 ring-emerald-300"
                title="Sole statutory authority to grant regulatory deposit approval"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-100" />
                <span>Grant Statutory Approval</span>
              </button>
            )}

            {/* Scrutiny Officer / Approver CBS Verification: Hidden from Institution */}
            {!isInstitutionUser && canVerify && fdr.status !== 'RELEASED' && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenBankVerification) {
                    onOpenBankVerification(fdr);
                  } else {
                    handlePerformVerification();
                  }
                }}
                disabled={isVerifying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                title="Execute real-time bank verification against Core Banking registers"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Execute Bank Verification (CBS)</span>
              </button>
            )}

            {/* Institution Security Indicator */}
            {isInstitutionUser && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px] font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Institutional Access (Approval restricted to AICTE)</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-slate-200 bg-white overflow-x-auto text-xs">
          {[
            { id: 'overview', label: 'Overview & Deposit Info', icon: Layers },
            { id: 'documents', label: `Documents (${fdr.documents?.length || 0})`, icon: FileText },
            { id: 'verification', label: 'Scrutiny & CBS Verification', icon: ShieldCheck },
            { id: 'forensics', label: 'AI Forensics & Tamper Engine', icon: ShieldAlert },
            { id: 'discrepancies', label: `Discrepancies (${fdr.discrepancies?.length || 0})`, icon: AlertTriangle },
            { id: 'renewals', label: 'Renewal & Lineage', icon: Repeat },
            { id: 'release', label: 'Release / Refund', icon: ArrowUpRightSquare },
            { id: 'timeline', label: 'Audit Timeline', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'border-blue-700 text-blue-800'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Financial Highlight Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Statutory Security Deposit Amount
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {formatIndianCurrency(fdr.amount)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      ({formatLakhs(fdr.amount)})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    Purpose: {fdr.purpose}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Maturity Date</span>
                    <span className="text-sm font-black text-slate-900 font-mono">{fdr.maturityDate}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Lock-In Tenure</span>
                    <span className="text-sm font-black text-slate-900">{fdr.validityPeriodMonths} Months</span>
                  </div>
                </div>
              </div>

              {/* Grid of Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Banking & Mandate Details */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Banking Instrument Specification
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">FDR Receipt Number</span>
                      <span className="font-bold text-slate-900">{fdr.fdrNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Bank Name</span>
                      <span className="font-bold text-slate-900">{fdr.bankName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Branch Name</span>
                      <span className="font-medium text-slate-800">{fdr.branchName || 'Not Specified'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900">{fdr.ifscCode}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Instrument Category</span>
                      <span className="font-semibold text-slate-900">{fdr.instrumentType}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Joint Holder / Lien Mandate</span>
                      <span className="font-semibold text-blue-900 text-right max-w-[200px]">{fdr.jointHolderName}</span>
                    </div>
                  </div>
                </div>

                {/* Institutional & Verification Status */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Institution &amp; Regulatory Tracking
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Institution Name</span>
                      <span className="font-bold text-slate-900 text-right">{fdr.institutionName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">AICTE Permanent ID</span>
                      <span className="font-mono font-bold text-slate-900">{fdr.institutionId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Submission Date</span>
                      <span className="font-medium text-slate-800">{fdr.submittedAt}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Lodged By</span>
                      <span className="font-medium text-slate-800">{fdr.submittedBy}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Current Lifecycle Status</span>
                      <StatusBadge status={fdr.status} size="sm" />
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Verification Authority</span>
                      <span className="font-medium text-slate-800">{fdr.verifiedBy || 'Pending Scrutiny'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks if present */}
              {fdr.remarks && (
                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg text-xs text-blue-900">
                  <span className="font-bold">Official Bureau Remarks: </span>
                  <span>{fdr.remarks}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Role-Based Policy Banners */}
              {isInstitutionUser ? (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Role-Based Access Policy (AICTE Regulations):</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Institutional authority accounts have upload and preview rights. In accordance with statutory Approval Process Handbook norms, <strong>document approvals, verification signoffs, and custody sanctions are executed exclusively by the AICTE Approving Authority</strong>.
                    </p>
                  </div>
                </div>
              ) : canApprove ? (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <BadgeCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Approving Authority Document Workspace:</span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        You have statutory authority to approve or reject individual documents, or accord blanket approval to the entire deposited dossier.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (fdr.documents) {
                        fdr.documents.forEach((d) => {
                          d.approvalStatus = 'APPROVED';
                          d.approvedBy = currentUser.name;
                          d.approvedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
                        });
                        fdr.timeline.push({
                          id: `tl-${Date.now()}`,
                          title: 'All Dossier Documents Approved (Approving Authority)',
                          description: `All deposited documents approved by ${currentUser.name} (${currentUser.designation}).`,
                          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                          performedBy: currentUser.name,
                          role: currentUser.role,
                          statusTag: fdr.status,
                        });
                        saveFdr(fdr, currentUser, 'ALL_DOCUMENTS_APPROVED');
                        showToast('All Documents Approved', 'Approving Authority seal applied to all attached documents.', 'success');
                        onRefreshFdr(fdr.id);
                        window.dispatchEvent(new CustomEvent('aicte_fdrs_updated'));
                      }
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs cursor-pointer shrink-0"
                  >
                    Approve All Documents
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Official Deposited Documents &amp; Version History
                  </h4>
                  <p className="text-[11px] text-slate-500">Access-controlled cryptographic repository</p>
                </div>

                <button
                  onClick={() => showToast('Secure Upload Initiated', 'Encrypted file upload channel opened. Stamping with SHA-256 fingerprint upon selection.', 'info')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Addendum Document</span>
                </button>
              </div>

              {fdr.documents && fdr.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fdr.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-slate-900 line-clamp-1">{doc.title}</h5>
                              <span className="text-[10px] text-slate-400 font-mono">{doc.originalFilename}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            v{doc.version}.0
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="font-semibold text-slate-700">{doc.documentType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span>{doc.fileSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uploaded:</span>
                            <span>{doc.uploadedAt}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono truncate">
                            <span>Hash:</span>
                            <span className="truncate max-w-[160px]">{doc.documentHash}</span>
                          </div>
                        </div>

                        {/* Document Approval Status Pill */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          {doc.approvalStatus === 'APPROVED' ? (
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Approved by Approver</span>
                              </span>
                              {doc.approvedBy && (
                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                                  {doc.approvedBy}
                                </span>
                              )}
                            </div>
                          ) : doc.approvalStatus === 'REJECTED' ? (
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Rejected by Approver</span>
                              </span>
                              <span className="text-[10px] text-rose-700 font-medium">Re-submission required</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Awaiting Approving Authority Signoff</span>
                              </span>
                              <span className="text-[10px] text-slate-400">Pending Review</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setSelectedDocPreview(doc)}
                            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Preview Document</span>
                          </button>
                          <button
                            onClick={() => showToast('Secure Download', `Initiating encrypted document transfer for ${doc.originalFilename}`, 'info')}
                            className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                            title="Download Document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Approving Authority Actions */}
                        {canApprove && (
                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                            {doc.approvalStatus !== 'APPROVED' ? (
                              <button
                                type="button"
                                onClick={() => handleApproveDocument(doc.id, 'APPROVED')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 transition-colors cursor-pointer"
                                title="Grant statutory approval for this document"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Approve Document</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3" /> Signed off by Approver
                              </span>
                            )}
                            {doc.approvalStatus !== 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => handleApproveDocument(doc.id, 'REJECTED')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                                title="Reject document"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Institution Read-Only Tag */}
                        {isInstitutionUser && (
                          <div className="text-[10px] text-slate-400 italic text-right">
                            Approval restricted to AICTE Approving Authority
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No scanned documents attached to this record</p>
                </div>
              )}

              {/* Document Preview Lightbox Modal */}
              {selectedDocPreview && (
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-800 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <h4 className="font-bold text-sm text-amber-400">{selectedDocPreview.title}</h4>
                      <p className="text-xs text-slate-400">{selectedDocPreview.originalFilename} • Validated Cryptographic Hash</p>
                    </div>
                    <button
                      onClick={() => setSelectedDocPreview(null)}
                      className="p-1 hover:bg-slate-800 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Simulated PDF / Receipt View */}
                  <div className="mt-4 p-6 bg-white text-slate-900 rounded-lg font-serif border border-slate-300 text-xs shadow-inner space-y-4">
                    <div className="text-center border-b pb-3">
                      <p className="font-bold text-sm tracking-wide uppercase">All India Council for Technical Education</p>
                      <p className="text-[10px] text-slate-500">Security Deposit / Fixed Deposit Receipt Endorsement</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <p className="text-slate-500">Deposit Number:</p>
                        <p className="font-bold">{fdr.fdrNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Principal Deposit:</p>
                        <p className="font-bold font-mono">{formatIndianCurrency(fdr.amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Depository Bank:</p>
                        <p className="font-bold">{fdr.bankName} ({fdr.branchName})</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Lien Endorsement:</p>
                        <p className="font-bold">In favor of Member Secretary, AICTE</p>
                      </div>
                    </div>

                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 text-[11px] font-sans">
                      ✓ Digital Document Signature Verified: Validated on Government SFMS Protocol with SHA-256 integrity seal.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VERIFICATION WORKSPACE (Crucial Requirement: Section 15) */}
          {activeTab === 'verification' && (
            <div className="space-y-5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Side-by-Side Scrutiny: Institution Claim vs. Core Banking CBS
                    </h4>
                    <p className="text-xs text-slate-500">
                      Independently verified via Prototype Core Banking / SFMS Interface
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Automated CBS Cross-Check
                  </span>
                </div>

                {/* Comparison Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Field Name</th>
                        <th className="px-3 py-2.5">Institution Submitted Data</th>
                        <th className="px-3 py-2.5">Independently Verified Data (CBS)</th>
                        <th className="px-3 py-2.5 text-center">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Field 1: FDR Number */}
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">FDR Receipt Number</td>
                        <td className="px-3 py-2.5 font-mono">{fdr.fdrNumber}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">
                          {fdr.verificationData?.verifiedFdrNumber || fdr.fdrNumber}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Match
                          </span>
                        </td>
                      </tr>

                      {/* Field 2: Bank Name */}
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">Bank Name</td>
                        <td className="px-3 py-2.5">{fdr.bankName}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {fdr.verificationData?.verifiedBank || fdr.bankName}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Match
                          </span>
                        </td>
                      </tr>

                      {/* Field 3: Deposit Amount */}
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">Principal Deposit Amount</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {formatIndianCurrency(fdr.amount)}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {fdr.verificationData?.verifiedAmount
                            ? formatIndianCurrency(fdr.verificationData.verifiedAmount)
                            : formatIndianCurrency(fdr.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {fdr.verificationData && !fdr.verificationData.fieldMatches.amount ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Match
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Field 4: Issue Date */}
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">Issue Date</td>
                        <td className="px-3 py-2.5">{fdr.issueDate}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {fdr.verificationData?.verifiedIssueDate || fdr.issueDate}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Match
                          </span>
                        </td>
                      </tr>

                      {/* Field 5: Maturity Date */}
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">Maturity Date</td>
                        <td className="px-3 py-2.5">{fdr.maturityDate}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {fdr.verificationData?.verifiedMaturityDate || fdr.maturityDate}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Match
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {fdr.verificationData?.cbsReferenceNumber && (
                  <div className="mt-3 p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
                    <span>
                      <strong>CBS Transaction Reference: </strong>
                      <span className="font-mono">{fdr.verificationData.cbsReferenceNumber}</span>
                    </span>
                    <span>Verified By: {fdr.verificationData.verifiedBy}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Authorized Scrutiny Officers */}
              {canVerify && fdr.status !== 'RELEASED' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Scrutiny Officer Regulatory Actions
                  </h4>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Primary CBS Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenBankVerification) {
                          onOpenBankVerification(fdr);
                        } else {
                          handlePerformVerification();
                        }
                      }}
                      disabled={isVerifying}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-blue-600"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-300" />
                      <span>{isVerifying ? 'Checking CBS Gateway...' : 'Execute Bank Verification (CBS)'}</span>
                    </button>

                    <button
                      onClick={() => setShowCorrectionForm(!showCorrectionForm)}
                      className="px-3 py-2 rounded-md font-bold text-xs bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Request Correction</span>
                    </button>

                    <button
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      className="px-3 py-2 rounded-md font-bold text-xs bg-rose-700 text-white hover:bg-rose-800 transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Submission</span>
                    </button>
                  </div>

                  {/* Correction Form Drawer */}
                  {showCorrectionForm && (
                    <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                      <label className="text-xs font-bold text-amber-950 block">
                        Specify Required Corrections for Institution:
                      </label>
                      <textarea
                        rows={3}
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        placeholder="e.g. Please furnish Bank Lien Endorsement on Branch Letterhead with authorized seal..."
                        className="w-full text-xs p-2 rounded border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowCorrectionForm(false)}
                          className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRequestCorrection}
                          className="px-3 py-1 text-xs font-bold bg-amber-700 text-white rounded hover:bg-amber-800"
                        >
                          Dispatch Correction Request
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rejection Form Drawer */}
                  {showRejectForm && (
                    <div className="mt-3 p-3.5 bg-rose-50 border border-rose-300 rounded-lg space-y-2">
                      <label className="text-xs font-bold text-rose-950 block">
                        Mandatory Reason for Rejection:
                      </label>
                      <textarea
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="State statutory violation or clause under AICTE Approval Process Handbook..."
                        className="w-full text-xs p-2 rounded border border-rose-300 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowRejectForm(false)}
                          className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRejectFdr}
                          className="px-3 py-1 text-xs font-bold bg-rose-700 text-white rounded hover:bg-rose-800"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI FORENSICS & TAMPER DETECTION TAB */}
          {activeTab === 'forensics' && (() => {
            const allFdrs = getFdrs();
            const forensics = performDocumentForensics(fdr, allFdrs);

            return (
              <div className="space-y-4">
                {/* Forensics Executive Scorecard */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                        Document Forensics Engine
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Digest: {forensics.forensicDigest.slice(0, 12)}...
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-white mt-1">
                      Statutory Compliance &amp; Tamper Risk Determination
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                      Automated rule checks, cross-institutional duplicate collateral surveillance, and digital image artifact detection.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 shrink-0">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Authenticity Score</p>
                      <p className="text-2xl font-black text-emerald-400 font-mono">
                        {forensics.authenticityScore}%
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-700" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tamper Risk</p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-0.5 ${
                          forensics.overallTamperRisk === 'LOW_RISK'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : forensics.overallTamperRisk === 'MEDIUM_RISK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {forensics.overallTamperRisk.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duplicate Collateral Alert (If Found) */}
                {forensics.duplicateCollateralFound && forensics.duplicateDetails && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-2 text-rose-950">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>CRITICAL COLLATERAL FRAUD ALERT: Duplicate Pledge Detected</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      The FDR Number <strong>{fdr.fdrNumber}</strong> has simultaneously been registered by another technical institution:
                    </p>
                    <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-xs font-mono">
                      <p><strong>Conflicting Institution: </strong>{forensics.duplicateDetails.conflictingInstitutionName}</p>
                      <p><strong>Permanent ID: </strong>{forensics.duplicateDetails.conflictingInstitutionId}</p>
                      <p><strong>Conflicting Instrument ID: </strong>{forensics.duplicateDetails.conflictingFdrId}</p>
                    </div>
                  </div>
                )}

                {/* Forensics Checks Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-800">
                      Forensic Rules &amp; Tamper Verification Matrix ({forensics.checks.length} Tests)
                    </h5>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Evaluated: {forensics.evaluatedAt.slice(0, 16)}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {forensics.checks.map((chk) => (
                      <div key={chk.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                chk.status === 'PASSED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : chk.status === 'WARNING'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {chk.status}
                            </span>
                            <span className="font-bold text-slate-900">{chk.title}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {chk.details}
                          </p>
                        </div>

                        {chk.confidenceScore && (
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">
                            {chk.confidenceScore}% Conf.
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Immutable Forensic Seal */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Cryptographic Block SHA-256: {forensics.forensicDigest}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <span>Inspect Public QR Seal</span>
                    &rarr;
                  </button>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: DISCREPANCIES */}
          {activeTab === 'discrepancies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Discrepancy Log &amp; Resolution Workspace
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    System and officer raised discrepancies requiring institutional clarification
                  </p>
                </div>
              </div>

              {fdr.discrepancies && fdr.discrepancies.length > 0 ? (
                <div className="space-y-3">
                  {fdr.discrepancies.map((disc) => (
                    <div
                      key={disc.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={disc.severity} size="sm" />
                          <span className="font-bold text-xs text-slate-900">{disc.type.replace('_', ' ')}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({disc.id})</span>
                        </div>
                        <StatusBadge status={disc.status} size="sm" />
                      </div>

                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {disc.description}
                      </p>

                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-4 pt-1">
                        <span>Detected: {disc.detectedAt}</span>
                        <span>Detected By: {disc.detectedBy}</span>
                        <span>Assigned Officer: {disc.assignedOfficer}</span>
                      </div>

                      {/* Institution Response section */}
                      {disc.institutionResponse && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
                          <p className="font-bold text-amber-900">Institution Clarification ({disc.institutionResponseAt}):</p>
                          <p className="text-amber-800 mt-1">{disc.institutionResponse}</p>
                        </div>
                      )}

                      {/* Resolution Notes */}
                      {disc.resolutionNotes && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                          <p className="font-bold text-emerald-900">Resolution Notes ({disc.resolvedAt}):</p>
                          <p className="text-emerald-800 mt-1">{disc.resolutionNotes}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {isInstitutionUser && disc.status !== 'RESOLVED' && (
                          <button
                            onClick={() => setActiveDiscrepancyId(activeDiscrepancyId === disc.id ? null : disc.id)}
                            className="px-3 py-1 rounded text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
                          >
                            Submit Clarification
                          </button>
                        )}

                        {canVerify && disc.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolveDiscrepancy(disc.id)}
                            className="px-3 py-1 rounded text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800"
                          >
                            Mark as Resolved
                          </button>
                        )}
                      </div>

                      {/* Clarification submission box */}
                      {activeDiscrepancyId === disc.id && (
                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                          <label className="text-xs font-bold text-slate-800">
                            Provide Official Institution Explanation / Upload Proof:
                          </label>
                          <textarea
                            rows={3}
                            value={discrepancyResponse}
                            onChange={(e) => setDiscrepancyResponse(e.target.value)}
                            placeholder="State details of corrected deposit or bank letter reference..."
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setActiveDiscrepancyId(null)}
                              className="px-2 py-1 text-xs text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSubmitDiscrepancyClarification(disc.id)}
                              className="px-3 py-1 text-xs font-bold bg-blue-700 text-white rounded hover:bg-blue-800"
                            >
                              Submit Clarification
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold">Zero Discrepancies</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">This FDR has no outstanding audit discrepancies.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RENEWAL & LINEAGE (Crucial Requirement: Section 20) */}
          {activeTab === 'renewals' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Unbroken Renewal Chain &amp; Predecessor Relationship
                </h4>
                <p className="text-xs text-slate-500">
                  AICTE regulatory policy mandates that prior FDRs are never deleted; a full cryptographic lineage is maintained between predecessor and successor instruments.
                </p>

                {fdr.renewalChain ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-4">
                      {fdr.renewalChain.previousFdrNumber && (
                        <div className="p-3 bg-white rounded-lg border border-slate-300 flex-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Predecessor FDR</span>
                          <span className="font-bold text-xs text-slate-800 font-mono">{fdr.renewalChain.previousFdrNumber}</span>
                          <span className="block text-[10px] text-slate-500 mt-1">Status: Superseded / Replaced</span>
                        </div>
                      )}

                      <Repeat className="w-6 h-6 text-blue-600 shrink-0" />

                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex-1">
                        <span className="text-[10px] text-blue-600 uppercase font-bold block">Current Instrument</span>
                        <span className="font-bold text-xs text-blue-900 font-mono">{fdr.fdrNumber}</span>
                        <span className="block text-[10px] text-blue-700 mt-1">Status: Active Successor</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                      <p><strong>Rollover Execution Date: </strong>{fdr.renewalChain.renewalDate || 'N/A'}</p>
                      <p className="mt-1"><strong>Lien Continuity Remarks: </strong>{fdr.renewalChain.renewalRemarks || 'Seamless regulatory rollover recorded.'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Primary Origination Instrument</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      This FDR was lodged as a direct initial submission and is not derived from a predecessor rollover.
                    </p>
                  </div>
                )}

                {/* Quick renewal submission button if approaching maturity */}
                {['EXPIRING_SOON', 'MATURED', 'OVERDUE'].includes(fdr.status) && isInstitutionUser && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-300 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-amber-950">Deposit Requires Rollover Renewal</p>
                      <p className="text-[11px] text-amber-800">Submit renewed instrument with unbroken lien in favor of AICTE.</p>
                    </div>
                    <button
                      onClick={() => showToast('Renewal Initiated', 'Directing to AICTE Renewal & Rollover lodgement desk.', 'info')}
                      className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 cursor-pointer"
                    >
                      Initiate Renewal
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: RELEASE / REFUND (Section 21) */}
          {activeTab === 'release' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Security Deposit Release &amp; Refund Mandate
                    </h4>
                    <p className="text-xs text-slate-500">Statutory procedure for discharge of AICTE joint lien</p>
                  </div>
                  {fdr.releaseRequest && <StatusBadge status={fdr.releaseRequest.status} size="sm" />}
                </div>

                {fdr.releaseRequest ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Petition Request ID</span>
                        <span className="font-mono font-bold text-slate-900">{fdr.releaseRequest.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Submission Date</span>
                        <span className="font-medium text-slate-800">{fdr.releaseRequest.submissionDate}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Institutional Reason / Justification</span>
                        <span className="font-medium text-slate-800">{fdr.releaseRequest.reason}</span>
                      </div>
                    </div>

                    {fdr.releaseRequest.officerObservations && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                        <p className="font-bold">Scrutiny Officer Recommendation ({fdr.releaseRequest.officerName}):</p>
                        <p className="mt-1">{fdr.releaseRequest.officerObservations}</p>
                      </div>
                    )}

                    {fdr.releaseRequest.sanctionOrderNumber && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                        <p className="font-bold">Sanction Order Issued:</p>
                        <p className="font-mono mt-0.5">{fdr.releaseRequest.sanctionOrderNumber}</p>
                        <p className="mt-1 text-emerald-800">{fdr.releaseRequest.approverRemarks}</p>
                      </div>
                    )}

                    {/* Competent Approving Authority Action */}
                    {canApprove && fdr.releaseRequest.status === 'RECOMMENDED_FOR_APPROVAL' && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                        <p className="font-bold text-purple-900">Approving Authority Mandate Action</p>
                        <p className="text-[11px] text-purple-800">
                          Review officer recommendation and accord formal sanction for lien release.
                        </p>
                        <button
                          onClick={() => {
                            if (fdr.releaseRequest) {
                              fdr.releaseRequest.status = 'APPROVED';
                              fdr.status = 'RELEASE_APPROVED';
                              fdr.releaseRequest.sanctionOrderNumber = `AICTE/RB/WEST/REL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
                              fdr.releaseRequest.approvalDate = new Date().toISOString().replace('T', ' ').slice(0, 16);
                              fdr.releaseRequest.approverName = currentUser.name;
                              fdr.releaseRequest.approverRemarks = 'Sanction approved as per Chapter 7 of Approval Process Handbook.';

                              fdr.timeline.push({
                                id: `tl-${Date.now()}`,
                                title: 'Sanction Order Issued for Release',
                                description: `Sanction Order ${fdr.releaseRequest.sanctionOrderNumber} issued by ${currentUser.name}.`,
                                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                                performedBy: currentUser.name,
                                role: currentUser.role,
                                statusTag: 'RELEASE_APPROVED',
                              });

                              saveFdr(fdr, currentUser, 'RELEASE_APPROVED');
                              showToast('Sanction Order Generated', `Sanction order ${fdr.releaseRequest.sanctionOrderNumber} generated successfully!`, 'success');
                              onRefreshFdr(fdr.id);
                            }
                          }}
                          className="px-4 py-1.5 rounded bg-purple-700 text-white font-bold hover:bg-purple-800 cursor-pointer"
                        >
                          Accord Formal Sanction for Release
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                    <p className="text-xs font-semibold">No release or refund petition submitted for this FDR.</p>
                    {isInstitutionUser && ['ACTIVE', 'MATURED'].includes(fdr.status) && (
                      <button
                        onClick={() => showToast('Release Portal', 'Navigating to Statutory Security Deposit Release & Refund Mandate Desk.', 'info')}
                        className="mt-3 px-3 py-1.5 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 cursor-pointer"
                      >
                        Submit Petition for Lien Release
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cryptographic Lifecycle Audit Timeline
              </h4>

              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
                {fdr.timeline && fdr.timeline.length > 0 ? (
                  fdr.timeline.map((evt) => (
                    <div key={evt.id} className="relative pl-6">
                      {/* Node point */}
                      <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100"></div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h5 className="font-bold text-xs text-slate-900">{evt.title}</h5>
                          <span className="text-[10px] text-slate-400 font-mono">{evt.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evt.description}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                          <span>
                            Actor: <strong>{evt.performedBy}</strong> ({evt.role})
                          </span>
                          {evt.statusTag && <StatusBadge status={evt.statusTag} size="sm" />}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 pl-6">No chronological timeline entries recorded.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>AICTE Security Deposit Verification Registry • SIH 2026 PS-26265</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Approving Authority Statutory Sanction Modal */}
      {showApproverModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-300 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Grant Statutory Approval</h3>
                  <p className="text-[11px] text-emerald-200">AICTE Approval Process Handbook (APH) Regulatory Signoff</p>
                </div>
              </div>
              <button
                onClick={() => setShowApproverModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target FDR:</span>
                  <span className="font-mono font-bold text-slate-900">{fdr.fdrNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regulated Institution:</span>
                  <span className="font-semibold text-slate-800">{fdr.institutionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Deposit Amount:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatIndianCurrency(fdr.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Depository Bank:</span>
                  <span className="text-slate-800">{fdr.bankName}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Statutory Sanction Order Number *
                </label>
                <input
                  type="text"
                  value={sanctionOrderNo}
                  onChange={(e) => setSanctionOrderNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  placeholder="e.g. AICTE/APH/2026/SANCTION-001"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Approving Authority Remarks &amp; Regulatory Directives
                </label>
                <textarea
                  rows={3}
                  value={approverNotes}
                  onChange={(e) => setApproverNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  placeholder="Enter official directives, stipulations, or approval observations..."
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Approving Authority Mandate Certification</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Executing this action activates the FDR into sovereign regulatory custody under role <strong>{currentUser.name} ({currentUser.designation})</strong>. All attached documents will receive digital statutory approval.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowApproverModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrantStatutoryApproval}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-200" />
                <span>Affix Digital Seal &amp; Approve FDR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating QR Modal */}
      {isQrModalOpen && (
        <FdrQrModal
          fdr={fdr}
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
        />
      )}
    </div>
  );
};
