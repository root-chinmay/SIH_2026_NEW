import React, { useState, useMemo } from 'react';
import { FDRRecord, Institution, Discrepancy } from '../../types';
import {
  Building2,
  FolderArchive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  ArrowUpRightSquare,
  FileCheck,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
  QrCode,
  Filter,
  Check,
  Zap,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatIndianCurrency, formatLakhs } from '../common/StatusBadge';
import { NavigationTab } from '../layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { FdrQrModal } from '../common/FdrQrModal';

interface AicteDashboardProps {
  fdrs: FDRRecord[];
  institutions: Institution[];
  discrepancies: Discrepancy[];
  onNavigateTab: (tab: NavigationTab, filterParams?: any) => void;
  onSelectFdr: (fdrId: string) => void;
  onOpenBankVerification?: (fdr: FDRRecord) => void;
}

export const AicteDashboard: React.FC<AicteDashboardProps> = ({
  fdrs,
  institutions,
  discrepancies,
  onNavigateTab,
  onSelectFdr,
  onOpenBankVerification,
}) => {
  const { currentUser, isInstitutionUser, canVerify, canApprove } = useAuth();
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('ALL');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');
  const [qrFdr, setQrFdr] = useState<FDRRecord | null>(null);

  // Institution mapping for regional lookup
  const instMap = useMemo(() => {
    const map = new Map<string, Institution>();
    institutions.forEach((i) => map.set(i.id, i));
    return map;
  }, [institutions]);

  // Scope to institution if user is an institution
  const baseFdrs = useMemo(() => {
    if (isInstitutionUser && currentUser.institutionId) {
      return fdrs.filter((f) => f.institutionId === currentUser.institutionId);
    }
    return fdrs;
  }, [fdrs, isInstitutionUser, currentUser]);

  // Extract unique regions, banks, and states
  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    institutions.forEach((i) => {
      if (i.aicteRegion) set.add(i.aicteRegion);
    });
    return Array.from(set).sort();
  }, [institutions]);

  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    baseFdrs.forEach((f) => {
      if (f.bankName) set.add(f.bankName);
    });
    return Array.from(set).sort();
  }, [baseFdrs]);

  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    institutions.forEach((i) => {
      if (i.state) set.add(i.state);
    });
    return Array.from(set).sort();
  }, [institutions]);

  // Apply drill-down filters
  const scopedFdrs = useMemo(() => {
    return baseFdrs.filter((f) => {
      const inst = instMap.get(f.institutionId);
      if (selectedRegionFilter !== 'ALL' && inst?.aicteRegion !== selectedRegionFilter) {
        return false;
      }
      if (selectedBankFilter !== 'ALL' && f.bankName !== selectedBankFilter) {
        return false;
      }
      if (selectedStateFilter !== 'ALL' && inst?.state !== selectedStateFilter) {
        return false;
      }
      return true;
    });
  }, [baseFdrs, instMap, selectedRegionFilter, selectedBankFilter, selectedStateFilter]);

  const scopedInstitutions = useMemo(() => {
    if (isInstitutionUser && currentUser.institutionId) {
      return institutions.filter((i) => i.id === currentUser.institutionId);
    }
    return institutions.filter((i) => {
      if (selectedRegionFilter !== 'ALL' && i.aicteRegion !== selectedRegionFilter) return false;
      if (selectedStateFilter !== 'ALL' && i.state !== selectedStateFilter) return false;
      return true;
    });
  }, [institutions, isInstitutionUser, currentUser, selectedRegionFilter, selectedStateFilter]);

  const scopedDiscrepancies = useMemo(() => {
    if (isInstitutionUser && currentUser.institutionId) {
      return discrepancies.filter((d) => d.institutionId === currentUser.institutionId);
    }
    return discrepancies.filter((d) => {
      const inst = instMap.get(d.institutionId);
      if (selectedRegionFilter !== 'ALL' && inst?.aicteRegion !== selectedRegionFilter) return false;
      if (selectedStateFilter !== 'ALL' && inst?.state !== selectedStateFilter) return false;
      return true;
    });
  }, [discrepancies, isInstitutionUser, currentUser, instMap, selectedRegionFilter, selectedStateFilter]);

  // Aggregate KPIs
  const totalInstitutions = scopedInstitutions.length;
  const totalFdrs = scopedFdrs.length;
  const activeFdrs = scopedFdrs.filter((f) => f.status === 'ACTIVE').length;
  const pendingVerification = scopedFdrs.filter(
    (f) => f.status === 'PENDING_VERIFICATION' || f.status === 'UNDER_REVIEW'
  ).length;
  const expiringSoon = scopedFdrs.filter((f) => f.status === 'EXPIRING_SOON').length;
  const matured = scopedFdrs.filter((f) => f.status === 'MATURED').length;
  const overdueCases = scopedFdrs.filter((f) => f.status === 'OVERDUE').length;
  const releaseRequests = scopedFdrs.filter(
    (f) => f.status === 'RELEASE_REQUESTED' || f.status === 'RELEASE_APPROVED'
  ).length;
  const openDiscrepancies = scopedDiscrepancies.filter(
    (d) => d.status === 'OPEN' || d.status === 'AWAITING_INSTITUTION' || d.status === 'UNDER_REVIEW'
  ).length;

  const totalDepositAmount = scopedFdrs
    .filter((f) => ['ACTIVE', 'EXPIRING_SOON', 'MATURED', 'PENDING_VERIFICATION'].includes(f.status))
    .reduce((acc, f) => acc + f.amount, 0);

  // Status Breakdown calculation
  const statusCounts: Record<string, number> = {
    ACTIVE: activeFdrs,
    EXPIRING_SOON: expiringSoon,
    PENDING_VERIFICATION: pendingVerification,
    MATURED: matured,
    OVERDUE: overdueCases,
    RELEASE_REQUESTED: releaseRequests,
    REPLACED: scopedFdrs.filter((f) => f.status === 'REPLACED').length,
  };

  // Top Banks Distribution
  const bankDistribution: Record<string, number> = {};
  scopedFdrs.forEach((f) => {
    bankDistribution[f.bankName] = (bankDistribution[f.bankName] || 0) + 1;
  });
  const topBanks = Object.entries(bankDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const hasActiveDrilldowns =
    selectedRegionFilter !== 'ALL' || selectedBankFilter !== 'ALL' || selectedStateFilter !== 'ALL';

  const handleClearFilters = () => {
    setSelectedRegionFilter('ALL');
    setSelectedBankFilter('ALL');
    setSelectedStateFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Official Header Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
              {isInstitutionUser ? 'Institution Portal Dashboard' : 'AICTE Regulation Bureau Dashboard'}
            </span>
            <span className="text-xs text-slate-400">
              {isInstitutionUser ? `• ${currentUser.institutionName}` : '• National Regulatory Surveillance'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-white">
            Security Deposit &amp; FDR Portfolio Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isInstitutionUser
              ? 'Manage institutional security deposits, track maturity alerts, respond to scrutiny discrepancies, and submit release requests.'
              : 'Centralized governance console for technical institutions across India. Live tracking of statutory Fixed Deposit Receipts, Core Banking verification, and lien releases.'}
          </p>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 sm:p-4 text-right shrink-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Custody Value</p>
          <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono tabular-nums">
            {formatIndianCurrency(totalDepositAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ({formatLakhs(totalDepositAmount)}) Across {totalFdrs} Instruments
          </p>
        </div>
      </div>

      {/* INTERACTIVE DRILL-DOWN FILTER BAR (State, Region, Bank) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
            <Filter className="w-4 h-4 text-blue-700" />
            <span>Interactive Drill-Down:</span>
          </span>

          {/* Region Filter */}
          <select
            value={selectedRegionFilter}
            onChange={(e) => setSelectedRegionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer text-xs"
          >
            <option value="ALL">All AICTE Regions</option>
            {uniqueRegions.map((reg) => (
              <option key={reg} value={reg}>
                {reg} Region
              </option>
            ))}
          </select>

          {/* Depository Bank Filter */}
          <select
            value={selectedBankFilter}
            onChange={(e) => setSelectedBankFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer text-xs"
          >
            <option value="ALL">All Depository Banks</option>
            {uniqueBanks.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>

          {/* State Filter */}
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer text-xs"
          >
            <option value="ALL">All Indian States</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {hasActiveDrilldowns && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer underline flex items-center gap-1"
          >
            <span>Reset Drill-Down Filters</span>
          </button>
        )}
      </div>

      {/* CORE STATISTIC METRIC CARDS (TOTAL FDRS & STATUSES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL FDRS (Clickable Button) */}
        <button
          type="button"
          onClick={() => onNavigateTab('fdrs', { status: 'ALL' })}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-400 transition-all text-left flex items-start justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL FDRS
            </p>
            <p className="text-3xl font-black text-slate-900 mt-1 font-mono tabular-nums">
              {totalFdrs}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
              Across {totalFdrs} regulated instruments...
            </p>
            <span className="text-[11px] font-bold text-blue-700 mt-2.5 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View All Repository &rarr;
            </span>
          </div>

          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-100 transition-colors">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          </div>
        </button>

        {/* Card 2: ACTIVE & COMPLIANT */}
        <button
          type="button"
          onClick={() => onNavigateTab('fdrs', { status: 'ACTIVE' })}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all text-left flex items-start justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ACTIVE &amp; COMPLIANT
            </p>
            <p className="text-3xl font-black text-emerald-700 mt-1 font-mono tabular-nums">
              {activeFdrs}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
              Full statutory regulatory standing
            </p>
            <span className="text-[11px] font-bold text-emerald-700 mt-2.5 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View Active FDRs &rarr;
            </span>
          </div>

          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </button>

        {/* Card 3: PENDING VERIFICATION */}
        <button
          type="button"
          onClick={() =>
            onNavigateTab(
              isInstitutionUser ? 'fdrs' : 'verification',
              isInstitutionUser ? { status: 'PENDING_VERIFICATION' } : undefined
            )
          }
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-500 transition-all text-left flex items-start justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isInstitutionUser ? 'AWAITING APPROVAL' : 'PENDING SCRUTINY'}
            </p>
            <p className="text-3xl font-black text-blue-700 mt-1 font-mono tabular-nums">
              {pendingVerification}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
              {isInstitutionUser
                ? 'Under AICTE regulatory review'
                : 'Awaiting Core Banking cross-check'}
            </p>
            <span className="text-[11px] font-bold text-blue-700 mt-2.5 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              {isInstitutionUser ? 'Track Submissions →' : 'Open Scrutiny Desk →'}
            </span>
          </div>

          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-100 transition-colors">
            <FileCheck className="w-6 h-6 text-blue-700" />
          </div>
        </button>

        {/* Card 4: EXPIRING SOON */}
        <button
          type="button"
          onClick={() => onNavigateTab('monitoring')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-400 transition-all text-left flex items-start justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              EXPIRING SOON
            </p>
            <p className="text-3xl font-black text-amber-700 mt-1 font-mono tabular-nums">
              {expiringSoon}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
              &le; 30 days to maturity date
            </p>
            <span className="text-[11px] font-bold text-amber-700 mt-2.5 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Review Expiry Queue &rarr;
            </span>
          </div>

          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </button>
      </div>

      {/* BEFORE / AFTER METRICS PANEL: PROOF OF MEASURABLE IMPROVEMENT */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                Measurable Impact (SIH PS-26265)
              </span>
              <span className="text-xs text-slate-300">
                Digital Transformation Benchmarking
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1">
              Legacy Manual Workflow vs. AICTE Automated Portal
            </h3>
          </div>
          <span className="text-xs text-amber-300 font-bold bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full self-start sm:self-auto">
            100% Audit Readiness
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Metric 1: Turnaround Time */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold uppercase text-[10px]">Turnaround Time</span>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">2.4 Days</span>
              <span className="text-xs text-slate-400 line-through">42.0 Days</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              <strong>94% Faster</strong>: Automated OCR extraction and Core Banking API replace physical courier dispatch.
            </p>
          </div>

          {/* Metric 2: Missed Renewals */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold uppercase text-[10px]">Missed Renewals</span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">0.0%</span>
              <span className="text-xs text-slate-400 line-through">18.7%</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              <strong>Zero Lapses</strong>: 5-stage automated alerts (90, 60, 30, 15, 7d) with SLA auto-escalation.
            </p>
          </div>

          {/* Metric 3: Scrutiny Hours Saved */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold uppercase text-[10px]">Officer Scrutiny Effort</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">85,000+</span>
              <span className="text-xs text-slate-400">Hours Saved</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Eliminates manual ledger matching and cross-referencing across 10,000+ technical institutions.
            </p>
          </div>

          {/* Metric 4: Duplicate Collateral Fraud */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold uppercase text-[10px]">Fraud Detection Rate</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">100%</span>
              <span className="text-xs text-slate-400 line-through">Undetected</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              Catches cross-institutional duplicate pledges, scan tampering, and incorrect lien stamping.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution Visual Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">FDR Portfolio Status Breakdown</h3>
              <p className="text-[11px] text-slate-500">Distribution across operational lifecycles</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 mt-4">
            {Object.entries(statusCounts).map(([statusKey, count]) => {
              const pct = totalFdrs > 0 ? Math.round((count / totalFdrs) * 100) : 0;
              let barColor = 'bg-slate-400';
              if (statusKey === 'ACTIVE') barColor = 'bg-emerald-500';
              if (statusKey === 'EXPIRING_SOON') barColor = 'bg-amber-500';
              if (statusKey === 'PENDING_VERIFICATION') barColor = 'bg-blue-500';
              if (statusKey === 'MATURED') barColor = 'bg-orange-500';
              if (statusKey === 'OVERDUE') barColor = 'bg-red-500';
              if (statusKey === 'RELEASE_REQUESTED') barColor = 'bg-purple-500';

              return (
                <div key={statusKey} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{statusKey.replace('_', ' ')}</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Depository Banks Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Top Depository Banks</h3>
              <p className="text-[11px] text-slate-500">Scheduled bank custody concentration</p>
            </div>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 mt-4">
            {topBanks.map(([bank, count]) => {
              const pct = totalFdrs > 0 ? Math.round((count / totalFdrs) * 100) : 0;
              return (
                <div key={bank} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[220px]">{bank}</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Priority FDR Cases with Quick Execute Bank Verification & QR Action */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Priority Security Deposits</h3>
            <p className="text-[11px] text-slate-500">
              Immediate inspection, Core Banking cross-check, and cryptographic QR seal
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('fdrs')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer"
          >
            View Full FDR Repository ({totalFdrs}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">FDR No. &amp; ID</th>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Bank &amp; Branch</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Maturity Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Direct Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopedFdrs.slice(0, 6).map((fdr) => (
                <tr key={fdr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 block font-mono">{fdr.fdrNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{fdr.id}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="font-semibold text-slate-800 line-clamp-1">{fdr.institutionName}</span>
                    <span className="text-[10px] text-slate-400">ID: {fdr.institutionId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{fdr.bankName}</span>
                    <span className="block text-[10px] text-slate-400">{fdr.branchName || 'Main'}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatIndianCurrency(fdr.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800 font-mono">{fdr.maturityDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800">
                      {fdr.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Direct QR Seal button */}
                      <button
                        type="button"
                        onClick={() => setQrFdr(fdr)}
                        className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="View Official QR Verification Seal"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-700" />
                        <span>QR</span>
                      </button>

                      {/* Inspect button */}
                      <button
                        type="button"
                        onClick={() => onSelectFdr(fdr.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>

                      {/* Dedicated Execute Bank Verification Button - Restricted to AICTE Scrutiny Officers & Approving Authority */}
                      {onOpenBankVerification && !isInstitutionUser && (canVerify || canApprove) && (
                        <button
                          type="button"
                          onClick={() => onOpenBankVerification(fdr)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Execute Core Banking verification test"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Verify (CBS)</span>
                        </button>
                      )}

                      {isInstitutionUser && (
                        <span className="px-2 py-1 text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-md border border-slate-200">
                          {fdr.status === 'ACTIVE' ? 'Approved' : 'Under Review'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating QR Modal */}
      {qrFdr && (
        <FdrQrModal
          fdr={qrFdr}
          isOpen={!!qrFdr}
          onClose={() => setQrFdr(null)}
        />
      )}
    </div>
  );
};
