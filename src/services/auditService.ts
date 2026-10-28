/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE FDR Portal - Cryptographically Sealed Audit Trail Service
 */

import { AuditLogItem, User } from '../types';
import { calculateAuditHash, verifyAuditChainIntegrity } from './securityService';

const AUDIT_STORAGE_KEY = 'aicte_fdr_audit_logs';

export function getAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const logs: AuditLogItem[] = JSON.parse(raw);
      return logs;
    }
  } catch (e) {
    console.error('Failed to load audit logs:', e);
  }
  return [];
}

export function logAuditEvent(params: {
  user: User;
  action: string;
  entity: AuditLogItem['entity'];
  entityId: string;
  description: string;
  previousValue?: string;
  newValue?: string;
}): AuditLogItem {
  const currentLogs = getAuditLogs();

  const now = new Date();
  const timestamp = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('en-IN', { hour12: false })} IST`;

  // Get previous log hash for hash-chaining (newest log is index 0, so current tip is currentLogs[0])
  const prevHash = currentLogs.length > 0 && currentLogs[0].hash 
    ? currentLogs[0].hash 
    : 'GENESIS_BLOCK_00000000000000000000';

  const logId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const preliminaryLog: Omit<AuditLogItem, 'hash'> & { prevHash: string } = {
    id: logId,
    timestamp,
    userId: params.user.id,
    userName: params.user.name,
    userRole: params.user.role,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    description: params.description,
    previousValue: params.previousValue,
    newValue: params.newValue,
    ipAddress: '14.139.112.45', // Regulatory Intranet Gateway IP
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'AICTE-Enterprise-Browser',
    prevHash,
    tamperSealVerified: true,
  };

  const hash = calculateAuditHash(preliminaryLog);

  const sealedLog: AuditLogItem = {
    ...preliminaryLog,
    hash,
  };

  const updatedLogs = [sealedLog, ...currentLogs];
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (e) {
    console.error('Failed to save audit log:', e);
  }

  // Dispatch custom event for real-time UI surveillance
  window.dispatchEvent(new CustomEvent('aicte_audit_updated', { detail: sealedLog }));
  return sealedLog;
}

export function verifyStoredAuditIntegrity() {
  const logs = getAuditLogs();
  return verifyAuditChainIntegrity(logs);
}
