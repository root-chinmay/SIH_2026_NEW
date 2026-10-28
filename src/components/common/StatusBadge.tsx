import React from 'react';
import { FdrStatus, VerificationState, DiscrepancySeverity, DiscrepancyStatus } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Archive,
  ArrowUpRight,
  ShieldCheck,
  XCircle,
  FileText,
} from 'lucide-react';

interface StatusBadgeProps {
  status: FdrStatus | VerificationState | DiscrepancyStatus | DiscrepancySeverity | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  switch (status) {
    case 'ACTIVE':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Active & Valid</span>
        </span>
      );

    case 'EXPIRING_SOON':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>Expiring Soon</span>
        </span>
      );

    case 'MATURED':
      return (
        <span className={`inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-300 ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          <span>Matured</span>
        </span>
      );

    case 'OVERDUE':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-300 font-semibold ${sizeClasses}`}>
          <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
          <span>Overdue Expiry</span>
        </span>
      );

    case 'PENDING_VERIFICATION':
    case 'PENDING':
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Pending Verification</span>
        </span>
      );

    case 'UNDER_REVIEW':
    case 'UNDER_SCRUTINY':
      return (
        <span className={`inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>Under Scrutiny</span>
        </span>
      );

    case 'CORRECTION_REQUIRED':
    case 'CORRECTION_REQUESTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-300 ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Correction Required</span>
        </span>
      );

    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 ${sizeClasses}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Verified & Approved</span>
        </span>
      );

    case 'REPLACED':
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}>
          <Archive className="w-3.5 h-3.5 text-slate-500" />
          <span>Replaced / Rollover</span>
        </span>
      );

    case 'RENEWAL_PENDING':
      return (
        <span className={`inline-flex items-center rounded-full bg-yellow-50 text-yellow-800 border border-yellow-300 ${sizeClasses}`}>
          <RefreshCw className="w-3.5 h-3.5 text-yellow-600" />
          <span>Renewal Required</span>
        </span>
      );

    case 'RELEASE_REQUESTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
          <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
          <span>Release Requested</span>
        </span>
      );

    case 'RELEASE_APPROVED':
    case 'RECOMMENDED_FOR_APPROVAL':
      return (
        <span className={`inline-flex items-center rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
          <span>Release Recommended</span>
        </span>
      );

    case 'RELEASED':
      return (
        <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-300 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
          <span>Lien Discharged / Released</span>
        </span>
      );

    case 'REJECTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>Rejected</span>
        </span>
      );

    case 'CRITICAL':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-300 font-bold ${sizeClasses}`}>
          <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
          <span>Critical Severity</span>
        </span>
      );

    case 'HIGH':
      return (
        <span className={`inline-flex items-center rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-semibold ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          <span>High Severity</span>
        </span>
      );

    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-yellow-600" />
          <span>Medium</span>
        </span>
      );

    case 'OPEN':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>Open Discrepancy</span>
        </span>
      );

    case 'AWAITING_INSTITUTION':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Awaiting Institution Response</span>
        </span>
      );

    case 'RESOLVED':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Discrepancy Resolved</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <span>{status}</span>
        </span>
      );
  }
};

export const formatIndianCurrency = (amount: number): string => {
  if (isNaN(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const formatLakhs = (amount: number): string => {
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)} Lakhs`;
};
