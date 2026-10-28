export type UserRole = 'INSTITUTION' | 'OFFICER' | 'APPROVER' | 'ADMIN' | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  department: string;
  institutionId?: string; // Set for INSTITUTION role
  institutionName?: string;
  phone: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin: string;
}

export type InstitutionType = 
  | 'Engineering & Technology' 
  | 'Management' 
  | 'Pharmacy' 
  | 'Architecture & Town Planning' 
  | 'Polytechnic Diploma' 
  | 'MCA & Computer Applications';

export interface Institution {
  id: string;
  aictePermanentId: string;
  name: string;
  type: InstitutionType;
  affiliationType: 'University Affiliated' | 'Deemed University' | 'Autonomous' | 'Government' | 'Private Unaided';
  state: string;
  city: string;
  address: string;
  pinCode: string;
  authorizedPerson: {
    name: string;
    designation: string;
    email: string;
    phone: string;
  };
  aicteRegion: 'Northern' | 'North-Western' | 'Eastern' | 'Western' | 'Central' | 'Southern' | 'South-Western';
  approvalStatus: 'Approved' | 'Extension Granted' | 'Under Scrutiny';
  establishedYear: number;
  totalFdrCount: number;
  activeFdrAmount: number; // in INR
}

export type FdrStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'MATURED'
  | 'OVERDUE'
  | 'RENEWAL_PENDING'
  | 'REPLACED'
  | 'RELEASE_REQUESTED'
  | 'RELEASE_APPROVED'
  | 'RELEASED'
  | 'REJECTED';

export type VerificationState = 'PENDING' | 'VERIFIED' | 'MISMATCH' | 'REJECTED' | 'CORRECTION_REQUESTED';

export type InstrumentType = 
  | 'Fixed Deposit Receipt (FDR)' 
  | 'Joint FDR (AICTE & Trust)' 
  | 'Bank Guarantee' 
  | 'Special Regulatory Escrow Deposit';

export interface BankVerificationData {
  verifiedFdrNumber: string;
  verifiedBank: string;
  verifiedBranch: string;
  verifiedAmount: number;
  verifiedIssueDate: string;
  verifiedMaturityDate: string;
  cbsReferenceNumber: string;
  verifiedStatus: 'VERIFIED' | 'MISMATCH' | 'NOT_VERIFIED' | 'SERVICE_UNAVAILABLE';
  verifiedAt: string;
  verifiedBy: string;
  notes?: string;
  fieldMatches: {
    fdrNumber: boolean;
    bankName: boolean;
    amount: boolean;
    issueDate: boolean;
    maturityDate: boolean;
  };
}

export interface FDRDocument {
  id: string;
  fdrId: string;
  title: string;
  documentType: 
    | 'FDR_RECEIPT_SCAN' 
    | 'BANK_LIEN_CONFIRMATION' 
    | 'TRUST_RESOLUTION' 
    | 'AUTHORIZED_SIGNATURE_SPECIMEN' 
    | 'RELEASE_NOC' 
    | 'REPLACEMENT_LETTER' 
    | 'CORRECTION_ADDENDUM';
  originalFilename: string;
  fileSize: string;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'REJECTED';
  approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  approvalRemarks?: string;
  fileData?: string; // Base64 or mock preview text
  documentHash: string;
}

export type DiscrepancyType =
  | 'AMOUNT_MISMATCH'
  | 'FDR_NUMBER_MISMATCH'
  | 'BANK_MISMATCH'
  | 'DATE_MISMATCH'
  | 'MISSING_DOCUMENT'
  | 'INVALID_LIEN_CONFIRMATION'
  | 'DUPLICATE_FDR'
  | 'EXPIRED_FDR'
  | 'NAME_MISMATCH';

export type DiscrepancySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DiscrepancyStatus = 'OPEN' | 'UNDER_REVIEW' | 'AWAITING_INSTITUTION' | 'RESOLVED' | 'CLOSED';

export interface Discrepancy {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  description: string;
  detectedAt: string;
  detectedBy: 'SYSTEM_AUTOMATION' | 'OFFICER_AUDIT' | 'BANK_CBS_API';
  status: DiscrepancyStatus;
  assignedOfficer: string;
  institutionResponse?: string;
  institutionResponseAt?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface RenewalChain {
  previousFdrId?: string;
  previousFdrNumber?: string;
  renewedFdrId?: string;
  renewedFdrNumber?: string;
  renewalDate?: string;
  renewalRemarks?: string;
}

export interface ReleaseRequest {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  amount: number;
  bankName: string;
  requestType: 'FULL_RELEASE' | 'PARTIAL_RELEASE' | 'REFUND_ON_CLOSURE' | 'SUBSTITUTION_RELEASE';
  submissionDate: string;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_SCRUTINY' | 'RECOMMENDED_FOR_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RELEASED';
  officerObservations?: string;
  officerName?: string;
  officerActionDate?: string;
  approverRemarks?: string;
  approverName?: string;
  approvalDate?: string;
  sanctionOrderNumber?: string;
  supportingDocuments: string[];
  requestedBy?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  performedBy: string;
  role: string;
  statusTag?: string;
}

export interface FDRRecord {
  id: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  amount: number; // in INR
  currency: 'INR';
  issueDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  validityPeriodMonths: number;
  instrumentType: InstrumentType;
  jointHolderName: string; // Typically "Member Secretary, AICTE"
  purpose: string;
  status: FdrStatus;
  verificationStatus: VerificationState;
  submittedAt: string;
  submittedBy: string;
  verifiedAt?: string;
  verifiedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  verificationData?: BankVerificationData;
  renewalChain?: RenewalChain;
  renewalHistory?: Array<{
    id?: string;
    renewalCycleNumber?: number;
    previousMaturityDate: string;
    newMaturityDate: string;
    renewedAmount?: number;
    renewedAt?: string;
  }>;
  releaseRequest?: ReleaseRequest;
  documents: FDRDocument[];
  discrepancies: Discrepancy[];
  timeline: TimelineEvent[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  targetRole?: UserRole | 'ALL';
  targetInstitutionId?: string;
  targetUserId?: string;
  type: 
    | 'SUBMISSION' 
    | 'VERIFICATION_REQUIRED' 
    | 'DISCREPANCY_DETECTED' 
    | 'CORRECTION_REQUIRED' 
    | 'EXPIRING_SOON' 
    | 'EXPIRY_REMINDER'
    | 'MATURED' 
    | 'OVERDUE' 
    | 'RENEWAL_SUBMITTED' 
    | 'RENEWAL_APPROVED' 
    | 'RELEASE_REQUESTED' 
    | 'RELEASE_APPROVED' 
    | 'ESCALATION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  relatedFdrId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: 'FDR' | 'INSTITUTION' | 'VERIFICATION' | 'DISCREPANCY' | 'RENEWAL' | 'RELEASE' | 'DOCUMENT' | 'USER' | 'SETTINGS' | 'AUTH' | 'SYSTEM' | 'SECURITY';
  entityId: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  userAgent: string;
  hash?: string;
  prevHash?: string;
  tamperSealVerified?: boolean;
}

export interface SystemSettings {
  reminderPeriod1Days: number; // default 60
  reminderPeriod2Days: number; // default 30
  reminderPeriod3Days: number; // default 15
  overdueEscalationDays: number; // default 7
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  autoBankVerificationEnabled: boolean;
  requireJointAccountWithAicte: boolean;
  minimumDepositThresholdLakhs: number;
  bankApiMockMode: 'NORMAL' | 'SIMULATE_MISMATCH' | 'SIMULATE_UNAVAILABLE';
  lastSchedulerRun: string;
}
