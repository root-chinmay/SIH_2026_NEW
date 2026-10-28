import { BankVerificationData, FDRRecord, SystemSettings } from '../types';

export interface BankVerificationResult {
  status: 'VERIFIED' | 'MISMATCH' | 'NOT_VERIFIED' | 'SERVICE_UNAVAILABLE';
  data?: BankVerificationData;
  error?: string;
  source: string;
}

/**
 * Prototype Verification Service
 * Note: Clearly labeled as Prototype/Demo abstraction layer.
 * In production, this service interfaces with authorized Core Banking Solution (CBS) /
 * RBI Structured Financial Messaging System (SFMS) APIs or direct Bank Gateway protocols.
 */
export async function performMockBankVerification(
  fdr: Pick<FDRRecord, 'fdrNumber' | 'bankName' | 'branchName' | 'amount' | 'issueDate' | 'maturityDate'>,
  settings: SystemSettings,
  verifierName: string = 'Dr. S. K. Sharma (AICTE Scrutiny Officer)'
): Promise<BankVerificationResult> {
  // Simulate network latency (400ms - 800ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (settings.bankApiMockMode === 'SIMULATE_UNAVAILABLE') {
    return {
      status: 'SERVICE_UNAVAILABLE',
      error: 'Prototype Bank CBS Gateway currently unreachable. Check SFMS connectivity.',
      source: 'Mock SFMS/CBS Interface (Offline Mode)',
    };
  }

  // If simulation mode is forced mismatch
  if (settings.bankApiMockMode === 'SIMULATE_MISMATCH') {
    const verifiedAmount = Math.max(1000000, fdr.amount - 500000);
    return {
      status: 'MISMATCH',
      source: 'Prototype Bank CBS Verification Gateway',
      data: {
        verifiedFdrNumber: fdr.fdrNumber,
        verifiedBank: fdr.bankName,
        verifiedBranch: fdr.branchName || 'Main Branch',
        verifiedAmount,
        verifiedIssueDate: fdr.issueDate,
        verifiedMaturityDate: fdr.maturityDate,
        cbsReferenceNumber: `CBS-SFMS-${Date.now().toString().slice(-6)}`,
        verifiedStatus: 'MISMATCH',
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: verifierName,
        notes: `Simulated Mismatch: CBS register indicates principal deposit of ₹${verifiedAmount.toLocaleString('en-IN')}/- instead of submitted ₹${fdr.amount.toLocaleString('en-IN')}/-.`,
        fieldMatches: {
          fdrNumber: true,
          bankName: true,
          amount: false,
          issueDate: true,
          maturityDate: true,
        },
      },
    };
  }

  // Realistic logic: If the bank name is known non-scheduled or bad FDR number
  const isInvalidBank = fdr.bankName.toLowerCase().includes('co-operative') || fdr.bankName.toLowerCase().includes('urban');
  if (isInvalidBank) {
    return {
      status: 'NOT_VERIFIED',
      error: 'Bank is not listed under the Second Schedule of the Reserve Bank of India Act, 1934.',
      source: 'Prototype Bank Verification Gateway',
      data: {
        verifiedFdrNumber: fdr.fdrNumber,
        verifiedBank: fdr.bankName,
        verifiedBranch: fdr.branchName,
        verifiedAmount: fdr.amount,
        verifiedIssueDate: fdr.issueDate,
        verifiedMaturityDate: fdr.maturityDate,
        cbsReferenceNumber: `CBS-FAIL-${Date.now().toString().slice(-4)}`,
        verifiedStatus: 'NOT_VERIFIED',
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: verifierName,
        notes: 'Verification declined: Financial institution is ineligible for regulatory deposits.',
        fieldMatches: {
          fdrNumber: false,
          bankName: false,
          amount: false,
          issueDate: false,
          maturityDate: false,
        },
      },
    };
  }

  // Normal verified match
  const cbsRef = `CBS-${fdr.bankName.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
  return {
    status: 'VERIFIED',
    source: 'Prototype Bank CBS Verification Gateway (SFMS Compatible)',
    data: {
      verifiedFdrNumber: fdr.fdrNumber,
      verifiedBank: fdr.bankName,
      verifiedBranch: fdr.branchName || 'Designated Institutional Branch',
      verifiedAmount: fdr.amount,
      verifiedIssueDate: fdr.issueDate,
      verifiedMaturityDate: fdr.maturityDate,
      cbsReferenceNumber: cbsRef,
      verifiedStatus: 'VERIFIED',
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      verifiedBy: verifierName,
      notes: '100% Parameter Match. Joint lien in favor of Member Secretary AICTE confirmed in CBS record.',
      fieldMatches: {
        fdrNumber: true,
        bankName: true,
        amount: true,
        issueDate: true,
        maturityDate: true,
      },
    },
  };
}
