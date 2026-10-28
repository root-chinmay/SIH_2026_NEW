import {
  Institution,
  FDRRecord,
  Discrepancy,
  NotificationItem,
  SystemSettings,
  User,
  FdrStatus,
  FDRDocument,
  ReleaseRequest,
} from '../types';
import {
  SEED_INSTITUTIONS,
  SEED_FDRS,
  SEED_NOTIFICATIONS,
  SEED_AUDIT_LOGS,
  DEFAULT_SYSTEM_SETTINGS,
} from '../data/seedData';
import { logAuditEvent } from './auditService';
import {
  validateStateTransition,
  validateMakerChecker,
  checkRateLimit,
  checkAndConsumeIdempotency,
  sanitizeInput,
  sha256Sync,
} from './securityService';

const KEY_INSTITUTIONS = 'aicte_fdr_institutions';
const KEY_FDRS = 'aicte_fdr_records';
const KEY_DISCREPANCIES = 'aicte_fdr_discrepancies';
const KEY_NOTIFICATIONS = 'aicte_fdr_notifications';
const KEY_SETTINGS = 'aicte_fdr_settings';
const KEY_AUDIT = 'aicte_fdr_audit_logs';

// Initialize storage with seeds if not populated
export function initializeStorage(forceReset = false): void {
  if (forceReset || !localStorage.getItem(KEY_INSTITUTIONS)) {
    localStorage.setItem(KEY_INSTITUTIONS, JSON.stringify(SEED_INSTITUTIONS));
  }

  if (forceReset || !localStorage.getItem(KEY_FDRS)) {
    localStorage.setItem(KEY_FDRS, JSON.stringify(SEED_FDRS));
  }

  if (forceReset || !localStorage.getItem(KEY_NOTIFICATIONS)) {
    localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  }

  if (forceReset || !localStorage.getItem(KEY_AUDIT)) {
    localStorage.setItem(KEY_AUDIT, JSON.stringify(SEED_AUDIT_LOGS));
  }

  if (forceReset || !localStorage.getItem(KEY_SETTINGS)) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
  }

  if (forceReset || !localStorage.getItem(KEY_DISCREPANCIES)) {
    // Extract seed discrepancies from FDR records
    const seedDiscrepancies: Discrepancy[] = [];
    SEED_FDRS.forEach((fdr) => {
      if (fdr.discrepancies && fdr.discrepancies.length > 0) {
        seedDiscrepancies.push(...fdr.discrepancies);
      }
    });
    localStorage.setItem(KEY_DISCREPANCIES, JSON.stringify(seedDiscrepancies));
  }
}

// ---------------- INSTITUTIONS ----------------
export function getInstitutions(): Institution[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(KEY_INSTITUTIONS);
    return raw ? JSON.parse(raw) : SEED_INSTITUTIONS;
  } catch (e) {
    console.error(e);
    return SEED_INSTITUTIONS;
  }
}

export function getInstitutionById(id: string): Institution | undefined {
  const list = getInstitutions();
  return list.find((i) => i.id === id || i.aictePermanentId === id);
}

export function saveInstitution(inst: Institution, user?: User): void {
  const list = getInstitutions();
  const idx = list.findIndex((i) => i.id === inst.id);
  if (idx >= 0) {
    list[idx] = inst;
  } else {
    list.unshift(inst);
  }
  localStorage.setItem(KEY_INSTITUTIONS, JSON.stringify(list));

  if (user) {
    logAuditEvent({
      user,
      action: idx >= 0 ? 'INSTITUTION_UPDATED' : 'INSTITUTION_REGISTERED',
      entity: 'INSTITUTION',
      entityId: inst.id,
      description: `Institution ${inst.name} (${inst.aictePermanentId}) details saved.`,
    });
  }
}

// ---------------- FDR RECORDS ----------------
export function getFdrs(): FDRRecord[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(KEY_FDRS);
    return raw ? JSON.parse(raw) : SEED_FDRS;
  } catch (e) {
    console.error(e);
    return SEED_FDRS;
  }
}

export function getFdrById(id: string): FDRRecord | undefined {
  const list = getFdrs();
  return list.find((f) => f.id === id || f.fdrNumber === id);
}

export function saveFdr(
  fdr: FDRRecord,
  user?: User,
  logAction?: string,
  diffDetails?: { prev?: string; next?: string }
): void {
  const list = getFdrs();
  const idx = list.findIndex((f) => f.id === fdr.id);
  const existing = idx >= 0 ? list[idx] : undefined;

  // Security Check 1: State Machine Transition Enforcement
  if (existing && existing.status !== fdr.status && user) {
    const transitionCheck = validateStateTransition(existing.status, fdr.status, user);
    if (!transitionCheck.isValid) {
      logAuditEvent({
        user,
        action: 'SECURITY_VIOLATION_BLOCKED',
        entity: 'SECURITY',
        entityId: fdr.id,
        description: `Blocked illegal transition on ${fdr.fdrNumber}: ${transitionCheck.error}`,
        previousValue: existing.status,
        newValue: fdr.status,
      });
      throw new Error(transitionCheck.error || 'Illegal state transition');
    }
  }

  // Security Check 2: Maker-Checker Enforcement for Release Sanction
  if (user && fdr.status === 'RELEASE_APPROVED' && existing && existing.status !== 'RELEASE_APPROVED') {
    const makerCheckerCheck = validateMakerChecker(user, 'SANCTION_RELEASE', fdr.releaseRequest?.requestedBy);
    if (!makerCheckerCheck.isValid) {
      logAuditEvent({
        user,
        action: 'MAKER_CHECKER_VIOLATION_BLOCKED',
        entity: 'SECURITY',
        entityId: fdr.id,
        description: makerCheckerCheck.error || 'Maker-checker violation blocked',
      });
      throw new Error(makerCheckerCheck.error);
    }
  }

  fdr.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

  if (idx >= 0) {
    list[idx] = fdr;
  } else {
    list.unshift(fdr);
  }
  localStorage.setItem(KEY_FDRS, JSON.stringify(list));

  // Sync back into Institution counters
  updateInstitutionFdrCounters(fdr.institutionId);

  if (user && logAction) {
    logAuditEvent({
      user,
      action: logAction,
      entity: 'FDR',
      entityId: fdr.id,
      description: `FDR ${fdr.fdrNumber} for ${fdr.institutionName} updated. Action: ${logAction}`,
      previousValue: diffDetails?.prev,
      newValue: diffDetails?.next || `Status: ${fdr.status}`,
    });
  }

  window.dispatchEvent(new CustomEvent('aicte_fdrs_updated', { detail: fdr }));
}

function updateInstitutionFdrCounters(institutionId: string): void {
  const fdrs = getFdrs().filter((f) => f.institutionId === institutionId);
  const inst = getInstitutionById(institutionId);
  if (!inst) return;

  inst.totalFdrCount = fdrs.length;
  inst.activeFdrAmount = fdrs
    .filter((f) => ['ACTIVE', 'EXPIRING_SOON', 'PENDING_VERIFICATION'].includes(f.status))
    .reduce((sum, f) => sum + f.amount, 0);

  const insts = getInstitutions();
  const idx = insts.findIndex((i) => i.id === institutionId);
  if (idx >= 0) {
    insts[idx] = inst;
    localStorage.setItem(KEY_INSTITUTIONS, JSON.stringify(insts));
  }
}

export function createFdr(
  params: Omit<FDRRecord, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'discrepancies'>,
  user: User,
  idempotencyKey?: string
): FDRRecord {
  // Rate limiting check: Max 10 submissions per minute per user
  const rateLimit = checkRateLimit('FDR_SUBMISSION', user.id, 10, 60000);
  if (!rateLimit.allowed) {
    logAuditEvent({
      user,
      action: 'RATE_LIMIT_BLOCKED',
      entity: 'SECURITY',
      entityId: user.id,
      description: `FDR submission blocked: ${rateLimit.reason}`,
    });
    throw new Error(rateLimit.reason);
  }

  // Idempotency check to prevent duplicate double-clicks
  const idempKey = idempotencyKey || `${user.id}-${params.fdrNumber}-${params.amount}`;
  const idempCheck = checkAndConsumeIdempotency(idempKey);
  if (idempCheck.isDuplicate) {
    logAuditEvent({
      user,
      action: 'IDEMPOTENCY_REPLAY_BLOCKED',
      entity: 'SECURITY',
      entityId: params.fdrNumber,
      description: idempCheck.message || 'Duplicate submission rejected',
    });
    throw new Error(idempCheck.message);
  }

  // Sanitize input values
  const sanitizedFdrNumber = sanitizeInput(params.fdrNumber);
  const sanitizedBankName = sanitizeInput(params.bankName);
  const sanitizedBranchName = sanitizeInput(params.branchName);
  const sanitizedIfsc = sanitizeInput(params.ifscCode).toUpperCase();

  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const newId = `FDR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // Stamp documents with cryptographic SHA-256 fingerprints if missing
  const hardenedDocs = (params.documents || []).map((doc) => ({
    ...doc,
    documentHash: doc.documentHash || sha256Sync(doc.title + doc.uploadedAt + newId),
  }));

  const newRecord: FDRRecord = {
    ...params,
    fdrNumber: sanitizedFdrNumber,
    bankName: sanitizedBankName,
    branchName: sanitizedBranchName,
    ifscCode: sanitizedIfsc,
    documents: hardenedDocs,
    id: newId,
    createdAt: now,
    updatedAt: now,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        title: 'FDR Submitted Digitally (Cryptographically Signed)',
        description: `Lodged with ${sanitizedBankName} for ₹${params.amount.toLocaleString('en-IN')}/- by ${user.name}.`,
        timestamp: now,
        performedBy: user.name,
        role: user.role,
        statusTag: params.status,
      },
    ],
    discrepancies: [],
  };

  saveFdr(newRecord, user, 'FDR_SUBMISSION', { next: `Status: ${newRecord.status}` });

  // Generate notification for AICTE officers
  addNotification({
    title: 'New FDR Submission for Verification',
    message: `${params.institutionName} has submitted a new FDR (${sanitizedFdrNumber}) for ₹${params.amount.toLocaleString('en-IN')}/- on ${sanitizedBankName}.`,
    targetRole: 'OFFICER',
    type: 'SUBMISSION',
    severity: 'INFO',
    relatedFdrId: newRecord.id,
  });

  return newRecord;
}

// ---------------- DISCREPANCIES ----------------
export function getDiscrepancies(): Discrepancy[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(KEY_DISCREPANCIES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function saveDiscrepancy(disc: Discrepancy, user?: User): void {
  const list = getDiscrepancies();
  const idx = list.findIndex((d) => d.id === disc.id);
  if (idx >= 0) {
    list[idx] = disc;
  } else {
    list.unshift(disc);
  }
  localStorage.setItem(KEY_DISCREPANCIES, JSON.stringify(list));

  // Also sync into parent FDR if present
  const fdr = getFdrById(disc.fdrId);
  if (fdr) {
    const fdrDiscIdx = fdr.discrepancies.findIndex((d) => d.id === disc.id);
    if (fdrDiscIdx >= 0) {
      fdr.discrepancies[fdrDiscIdx] = disc;
    } else {
      fdr.discrepancies.unshift(disc);
    }
    saveFdr(fdr);
  }

  if (user) {
    logAuditEvent({
      user,
      action: idx >= 0 ? 'DISCREPANCY_UPDATED' : 'DISCREPANCY_RAISED',
      entity: 'DISCREPANCY',
      entityId: disc.id,
      description: `Discrepancy ${disc.id} for FDR ${disc.fdrNumber} (${disc.type}): ${disc.description}`,
      newValue: `Status: ${disc.status}`,
    });
  }

  window.dispatchEvent(new CustomEvent('aicte_discrepancies_updated', { detail: disc }));
}

// ---------------- NOTIFICATIONS ----------------
export function getNotifications(): NotificationItem[] {
  initializeStorage();
  try {
    const raw = localStorage.getItem(KEY_NOTIFICATIONS);
    return raw ? JSON.parse(raw) : SEED_NOTIFICATIONS;
  } catch (e) {
    console.error(e);
    return SEED_NOTIFICATIONS;
  }
}

export function addNotification(params: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): NotificationItem {
  const list = getNotifications();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const newItem: NotificationItem = {
    ...params,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: now,
    isRead: false,
  };
  list.unshift(newItem);
  localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('aicte_notifications_updated', { detail: newItem }));
  return newItem;
}

export function markNotificationRead(id: string): void {
  const list = getNotifications();
  const item = list.find((n) => n.id === id);
  if (item) {
    item.isRead = true;
    localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('aicte_notifications_updated', { detail: item }));
  }
}

export function markAllNotificationsRead(user?: User): void {
  const list = getNotifications();
  list.forEach((n) => {
    if (!user || user.role === 'ADMIN' || n.targetRole === 'ALL' || n.targetRole === user.role || n.targetInstitutionId === user.institutionId) {
      n.isRead = true;
    }
  });
  localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('aicte_notifications_updated', { detail: list }));
}

// ---------------- SETTINGS ----------------
export function getSystemSettings(): SystemSettings {
  initializeStorage();
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    return raw ? JSON.parse(raw) : DEFAULT_SYSTEM_SETTINGS;
  } catch (e) {
    console.error(e);
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

export function saveSystemSettings(settings: SystemSettings, user: User): void {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  logAuditEvent({
    user,
    action: 'SETTINGS_CONFIGURED',
    entity: 'SETTINGS',
    entityId: 'SYSTEM_CONFIG',
    description: `Regulatory reminder & verification policies updated by System Admin.`,
    newValue: `Reminders: ${settings.reminderPeriod1Days}d, ${settings.reminderPeriod2Days}d, ${settings.reminderPeriod3Days}d. MockMode: ${settings.bankApiMockMode}`,
  });
  window.dispatchEvent(new CustomEvent('aicte_settings_updated', { detail: settings }));
}

// ---------------- LIFECYCLE & MATURITY SCHEDULER ----------------
/**
 * Automatically evaluates all FDR maturity dates against current date and configured rules.
 * Reference Date: October 25, 2026.
 */
export function runMaturityAndLifecycleScheduler(user?: User): {
  checkedCount: number;
  expiringCount: number;
  maturedCount: number;
  overdueCount: number;
  newAlertsCount: number;
} {
  const fdrs = getFdrs();
  const settings = getSystemSettings();
  const today = new Date('2026-10-25T00:00:00'); // Standard simulation baseline

  let expiringCount = 0;
  let maturedCount = 0;
  let overdueCount = 0;
  let newAlertsCount = 0;

  fdrs.forEach((fdr) => {
    // Only check active or maturing FDRs
    if (['REPLACED', 'RELEASED', 'REJECTED', 'DRAFT'].includes(fdr.status)) {
      return;
    }

    const matDate = new Date(fdr.maturityDate);
    const diffTime = matDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let updated = false;
    let oldStatus = fdr.status;

    if (diffDays < 0) {
      // Past maturity
      const overdueDays = Math.abs(diffDays);
      if (overdueDays > settings.overdueEscalationDays && fdr.status !== 'OVERDUE') {
        fdr.status = 'OVERDUE';
        overdueCount++;
        updated = true;

        addNotification({
          title: `CRITICAL: Overdue FDR Escalation (${fdr.fdrNumber})`,
          message: `FDR ${fdr.fdrNumber} for ${fdr.institutionName} is ${overdueDays} days past its maturity date of ${fdr.maturityDate}. Immediate renewal or release action required under AICTE regulations.`,
          targetRole: 'OFFICER',
          type: 'ESCALATION',
          severity: 'CRITICAL',
          relatedFdrId: fdr.id,
        });
        newAlertsCount++;
      } else if (fdr.status !== 'MATURED' && fdr.status !== 'OVERDUE' && fdr.status !== 'RELEASE_REQUESTED') {
        fdr.status = 'MATURED';
        maturedCount++;
        updated = true;

        addNotification({
          title: `FDR Matured: ${fdr.fdrNumber}`,
          message: `FDR for ${fdr.institutionName} has completed its validity on ${fdr.maturityDate}. Institution must submit renewal or release petition.`,
          targetRole: 'ALL',
          targetInstitutionId: fdr.institutionId,
          type: 'MATURED',
          severity: 'WARNING',
          relatedFdrId: fdr.id,
        });
        newAlertsCount++;
      }
    } else if (diffDays <= settings.reminderPeriod2Days) {
      // Within reminder 2 period (e.g. 30 days)
      if (fdr.status === 'ACTIVE') {
        fdr.status = 'EXPIRING_SOON';
        expiringCount++;
        updated = true;

        addNotification({
          title: `Upcoming Maturity Alert: ${diffDays} Days Remaining`,
          message: `FDR ${fdr.fdrNumber} for ${fdr.institutionName} will mature on ${fdr.maturityDate} (${diffDays} days). Renewal preparation mandatory.`,
          targetRole: 'ALL',
          targetInstitutionId: fdr.institutionId,
          type: 'EXPIRING_SOON',
          severity: 'WARNING',
          relatedFdrId: fdr.id,
        });
        newAlertsCount++;
      }
    }

    if (updated) {
      fdr.timeline.push({
        id: `tl-sched-${Date.now()}-${Math.random()}`,
        title: `Automated Lifecycle Status Transition: ${fdr.status}`,
        description: `Maturity evaluation engine calculated ${diffDays} days to maturity. Status shifted from ${oldStatus} to ${fdr.status}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        performedBy: 'System Automation Engine',
        role: 'SYSTEM',
        statusTag: fdr.status,
      });
      saveFdr(fdr);
    }
  });

  // Update last run in settings
  settings.lastSchedulerRun = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST';
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));

  if (user) {
    logAuditEvent({
      user,
      action: 'SCHEDULER_RUN',
      entity: 'SYSTEM',
      entityId: 'MATURITY_ENGINE',
      description: `Maturity & Validity engine manually executed. Checked ${fdrs.length} FDR records. Expiring: ${expiringCount}, Matured: ${maturedCount}, Overdue: ${overdueCount}.`,
    });
  }

  return {
    checkedCount: fdrs.length,
    expiringCount,
    maturedCount,
    overdueCount,
    newAlertsCount,
  };
}

// Reset everything to pristine seed state
export function resetToSeedData(user: User): void {
  initializeStorage(true);
  logAuditEvent({
    user,
    action: 'DEMO_DATA_RESET',
    entity: 'SYSTEM',
    entityId: 'DATABASE',
    description: 'All portal entities restored to initial Smart India Hackathon 2026 seed baseline.',
  });
  window.dispatchEvent(new CustomEvent('aicte_database_reset'));
}
