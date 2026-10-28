import React, { useState } from 'react';
import { Institution, InstrumentType, FDRDocument } from '../../types';
import {
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createFdr, getSystemSettings } from '../../services/storage';
import { formatIndianCurrency } from '../common/StatusBadge';
import { OcrExtractionCard, OcrExtractedData } from './OcrExtractionCard';

interface FdrSubmissionWizardProps {
  institutions: Institution[];
  onSubmissionSuccess: (fdrId: string) => void;
  onCancel: () => void;
}

export const FdrSubmissionWizard: React.FC<FdrSubmissionWizardProps> = ({
  institutions,
  onSubmissionSuccess,
  onCancel,
}) => {
  const { currentUser, isInstitutionUser } = useAuth();
  const { showToast } = useToast();
  const settings = getSystemSettings();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedInstId, setSelectedInstId] = useState<string>(
    isInstitutionUser && currentUser.institutionId ? currentUser.institutionId : institutions[0]?.id || ''
  );
  const [fdrNumber, setFdrNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('SBIN0001001');
  const [amount, setAmount] = useState<number>(1500000);
  const [issueDate, setIssueDate] = useState('2026-10-25');
  const [maturityDate, setMaturityDate] = useState('2031-10-25');
  const [validityMonths, setValidityMonths] = useState<number>(60);
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('Joint FDR (AICTE & Trust)');
  const [jointHolder, setJointHolder] = useState('Member Secretary, AICTE & Governing Trust');
  const [purpose, setPurpose] = useState('Security Deposit for Regulatory Approval (APH 2024-27)');

  // Mock Uploaded Documents
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; type: string }>>([
    { name: 'Original_FDR_Receipt_Scan.pdf', size: '1.8 MB', type: 'FDR_RECEIPT_SCAN' },
    { name: 'Bank_Lien_Confirmation_Letter.pdf', size: '1.1 MB', type: 'BANK_LIEN_CONFIRMATION' },
  ]);

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const selectedInst = institutions.find((i) => i.id === selectedInstId) || institutions[0];

  const handleApplyOcrData = (data: OcrExtractedData) => {
    setFdrNumber(data.fdrNumber);
    setBankName(data.bankName);
    setBranchName(data.branchName);
    setIfscCode(data.ifscCode);
    setAmount(data.amount);
    setIssueDate(data.issueDate);
    setMaturityDate(data.maturityDate);
    setJointHolder(data.jointHolder);

    // Calculate validity months
    const issue = new Date(data.issueDate).getTime();
    const mat = new Date(data.maturityDate).getTime();
    const months = Math.round((mat - issue) / (1000 * 60 * 60 * 24 * 30.4375));
    if (months > 0) setValidityMonths(months);

    showToast(
      'OCR Data Applied!',
      `Receipt ${data.fdrNumber} auto-populated with average 98.6% confidence rating.`,
      'success'
    );
  };

  const handleNextStep = () => {
    setFormErrors([]);
    const errors: string[] = [];

    if (currentStep === 1) {
      if (!selectedInstId) errors.push('Please select a valid institution.');
    } else if (currentStep === 2) {
      if (!fdrNumber.trim()) errors.push('FDR Receipt Number is mandatory.');
      if (!bankName.trim()) errors.push('Depository Bank name is mandatory.');
      if (!branchName.trim()) errors.push('Branch name is mandatory.');
      if (!ifscCode.trim()) errors.push('Branch IFSC code is required.');
      if (amount <= 0) errors.push('Deposit amount must be greater than zero.');
      if (new Date(maturityDate) <= new Date(issueDate)) {
        errors.push('Maturity date must be strictly after the issue date.');
      }
    } else if (currentStep === 3) {
      if (uploadedFiles.length === 0) {
        errors.push('At least one FDR scanned certificate must be uploaded.');
      }
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleFinalSubmit = () => {
    // Construct documents array
    const documents: FDRDocument[] = uploadedFiles.map((file, idx) => ({
      id: `doc-sub-${Date.now()}-${idx}`,
      fdrId: '',
      title: file.type.replace(/_/g, ' '),
      documentType: file.type as any,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: 'application/pdf',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      uploadedBy: currentUser.name,
      version: 1,
      status: 'ACTIVE',
      documentHash: `sha256-mockhash${Math.random().toString(36).substring(2, 15)}`,
    }));

    const created = createFdr(
      {
        fdrNumber: fdrNumber.trim(),
        institutionId: selectedInst.id,
        institutionName: selectedInst.name,
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        amount: Number(amount),
        currency: 'INR',
        issueDate,
        maturityDate,
        validityPeriodMonths: Number(validityMonths),
        instrumentType,
        jointHolderName: jointHolder,
        purpose,
        status: 'PENDING_VERIFICATION',
        verificationStatus: 'PENDING',
        submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        submittedBy: `${currentUser.name} (${currentUser.designation})`,
        documents,
      },
      currentUser
    );

    showToast(
      'FDR Successfully Lodged',
      `FDR ${created.fdrNumber} submitted for verification. Audit trail logged.`,
      'success'
    );
    onSubmissionSuccess(created.id);
  };

  const steps = [
    { number: 1, label: 'Institution Selection' },
    { number: 2, label: 'FDR & Banking Details' },
    { number: 3, label: 'Document Attachments' },
    { number: 4, label: 'Scrutiny Review & Summary' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
              <span>Digital FDR Submission Workflow</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-step regulatory filing under AICTE Security Deposit guidelines
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel Filing
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {steps.map((s) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            return (
              <div key={s.number} className="text-center">
                <div
                  className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-700 text-white ring-4 ring-blue-100'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.number}
                </div>
                <p
                  className={`text-[11px] font-semibold mt-1.5 line-clamp-1 ${
                    isCurrent ? 'text-blue-900' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Errors Box */}
      {formErrors.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <ul className="list-disc list-inside space-y-0.5">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* STEP 1: INSTITUTION SELECTION */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
            Step 1: Institutional Attribution
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Submitting Technical Institution:
            </label>
            <select
              disabled={isInstitutionUser}
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 disabled:opacity-75"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.city}, {inst.state}) - AICTE ID: {inst.aictePermanentId}
                </option>
              ))}
            </select>
            {isInstitutionUser && (
              <p className="text-[11px] text-slate-400 mt-1">
                🔒 Fixed: You are logged in under authorized institutional credentials for {selectedInst?.name}.
              </p>
            )}
          </div>

          {selectedInst && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">AICTE Permanent ID:</span>
                <span className="font-mono font-bold text-slate-900">{selectedInst.aictePermanentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Institution Category:</span>
                <span className="font-semibold text-slate-800">{selectedInst.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AICTE Regional Office:</span>
                <span className="font-semibold text-slate-800">{selectedInst.aicteRegion} Regional Office</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authorized Signatory:</span>
                <span className="font-medium text-slate-800">
                  {selectedInst.authorizedPerson.name} ({selectedInst.authorizedPerson.designation})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: FDR DETAILS */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
              Step 2: Fixed Deposit Receipt &amp; Banking Specifics
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Use automated OCR extraction below to eliminate manual data entry, or input parameters manually.
            </p>
          </div>

          {/* OCR Auto-Extraction Card */}
          <OcrExtractionCard onApplyOcrData={handleApplyOcrData} />

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Verified Banking &amp; Regulatory Parameters:
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">FDR Receipt Number *</label>
              <input
                type="text"
                placeholder="e.g. SBI/2026/889911"
                value={fdrNumber}
                onChange={(e) => setFdrNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Scheduled Bank Name *</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium"
              >
                <option value="State Bank of India">State Bank of India</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Canara Bank">Canara Bank</option>
                <option value="Union Bank of India">Union Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                <option value="Indian Bank">Indian Bank</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Branch Name &amp; City *</label>
              <input
                type="text"
                placeholder="e.g. Dhankawadi Branch, Pune"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Branch IFSC Code *</label>
              <input
                type="text"
                placeholder="e.g. SBIN0004512"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Deposit Principal Amount (INR) *</label>
              <input
                type="number"
                step="50000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">{formatIndianCurrency(amount)}</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Instrument Category</label>
              <select
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
              >
                <option value="Joint FDR (AICTE & Trust)">Joint FDR (AICTE & Trust)</option>
                <option value="Fixed Deposit Receipt (FDR)">Fixed Deposit Receipt (FDR)</option>
                <option value="Bank Guarantee">Bank Guarantee</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Issue / Deposit Date *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Maturity Date *</label>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Joint Holder / Mandatory Lien Endorsement *</label>
              <input
                type="text"
                value={jointHolder}
                onChange={(e) => setJointHolder(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Regulatory Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DOCUMENT UPLOAD */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
            Step 3: Document Attachments &amp; Security Validation
          </h3>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50">
            <Upload className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-xs font-bold text-slate-900">Upload Scanned FDR &amp; Bank Confirmation Certificates</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supported Formats: PDF, JPG, PNG (Max {settings.maxFileSizeMb} MB per file). Automated SHA-256 integrity seal applied upon upload.
            </p>
            <button
              onClick={() => {
                const sampleName = `FDR_Scan_${Math.floor(100 + Math.random() * 900)}.pdf`;
                setUploadedFiles((prev) => [
                  ...prev,
                  { name: sampleName, size: '2.1 MB', type: 'FDR_RECEIPT_SCAN' },
                ]);
              }}
              className="mt-3 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-700 text-white hover:bg-blue-800"
            >
              + Attach Supplementary File
            </button>
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-xs font-bold text-slate-700">Attached Documents ({uploadedFiles.length}):</p>
            {uploadedFiles.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span className="font-semibold text-slate-800">{f.name}</span>
                  <span className="text-[10px] text-slate-400">({f.size})</span>
                </div>
                <button
                  onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & SUMMARY */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
            Step 4: Formal Verification Review &amp; Declaration
          </h3>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Institution:</span>
                <p className="font-bold text-slate-900">{selectedInst.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Permanent ID:</span>
                <p className="font-mono font-bold text-slate-900">{selectedInst.aictePermanentId}</p>
              </div>
              <div>
                <span className="text-slate-500">FDR Number:</span>
                <p className="font-mono font-bold text-slate-900">{fdrNumber}</p>
              </div>
              <div>
                <span className="text-slate-500">Bank &amp; Branch:</span>
                <p className="font-medium text-slate-800">{bankName} ({branchName})</p>
              </div>
              <div>
                <span className="text-slate-500">Principal Deposit:</span>
                <p className="font-mono font-extrabold text-blue-900 text-sm">{formatIndianCurrency(amount)}</p>
              </div>
              <div>
                <span className="text-slate-500">Maturity Date:</span>
                <p className="font-medium text-slate-800">{maturityDate}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Mandatory Joint Lien:</span>
                <p className="font-semibold text-slate-900">{jointHolder}</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Regulatory Undertaking: </strong>
              I hereby certify that the Fixed Deposit Receipt submitted above has been drawn on a Scheduled Commercial Bank with an irrevocable lien in favor of the Member Secretary, AICTE, as per Clause 4.8 of the AICTE Approval Process Handbook.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {currentStep > 1 ? (
          <button
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>
        ) : (
          <div></div>
        )}

        {currentStep < 4 ? (
          <button
            onClick={handleNextStep}
            className="flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-bold bg-blue-700 text-white hover:bg-blue-800"
          >
            <span>Proceed to Step {currentStep + 1}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleFinalSubmit}
            className="flex items-center gap-1.5 px-6 py-2 rounded-md text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit for Regulatory Scrutiny</span>
          </button>
        )}
      </div>
    </div>
  );
};
