import React, { useState } from 'react';
import { FDRRecord } from '../../types';
import { StatusBadge, formatIndianCurrency } from '../common/StatusBadge';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Building2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  BellRing,
  Filter,
  Mail,
  MessageSquare,
  Smartphone,
  ShieldAlert,
  Send,
  CheckCircle2,
  X,
  Timer,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSystemSettings, runMaturityAndLifecycleScheduler, addNotification } from '../../services/storage';

interface ExpiryMonitoringProps {
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
  onRefreshData: () => void;
}

export const ExpiryMonitoring: React.FC<ExpiryMonitoringProps> = ({
  fdrs,
  onSelectFdr,
  onRefreshData,
}) => {
  const { currentUser, isInstitutionUser } = useAuth();
  const { showToast } = useToast();
  const settings = getSystemSettings();
  const [activeBucket, setActiveBucket] = useState<'ALL' | 'EXPIRING_SOON' | 'MATURED' | 'OVERDUE'>('ALL');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeDispatchFdr, setActiveDispatchFdr] = useState<FDRRecord | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState<'ALL' | 'EMAIL' | 'SMS' | 'IN_APP'>('ALL');
  const [isDispatching, setIsDispatching] = useState(false);

  // Baseline simulated date: 2026-10-25
  const today = new Date('2026-10-25T00:00:00');

  const scopedFdrs = fdrs.filter((f) => {
    if (isInstitutionUser && currentUser.institutionId) {
      return f.institutionId === currentUser.institutionId;
    }
    return true;
  });

  // Calculate days to maturity for each
  const listWithDiff = scopedFdrs
    .map((fdr) => {
      const mat = new Date(fdr.maturityDate);
      const diffTime = mat.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Escalation Tier calculation
      let escalationTier: 'TIER_1_INSTITUTION' | 'TIER_2_REGIONAL' | 'TIER_3_BUREAU_HEAD' = 'TIER_1_INSTITUTION';
      let slaHours = 360; // 15 days default

      if (diffDays <= 0 || fdr.status === 'OVERDUE') {
        escalationTier = 'TIER_3_BUREAU_HEAD';
        slaHours = 48;
      } else if (diffDays <= 15) {
        escalationTier = 'TIER_2_REGIONAL';
        slaHours = 168; // 7 days
      } else {
        escalationTier = 'TIER_1_INSTITUTION';
        slaHours = 360;
      }

      return { fdr, diffDays, escalationTier, slaHours };
    })
    .sort((a, b) => a.diffDays - b.diffDays);

  const expiringSoonList = listWithDiff.filter((item) => item.fdr.status === 'EXPIRING_SOON' || (item.diffDays > 0 && item.diffDays <= 30));
  const maturedList = listWithDiff.filter((item) => item.fdr.status === 'MATURED');
  const overdueList = listWithDiff.filter((item) => item.fdr.status === 'OVERDUE' || item.diffDays < -settings.overdueEscalationDays);

  const displayedList = listWithDiff.filter((item) => {
    if (activeBucket === 'EXPIRING_SOON') return expiringSoonList.includes(item);
    if (activeBucket === 'MATURED') return maturedList.includes(item);
    if (activeBucket === 'OVERDUE') return overdueList.includes(item);
    return ['EXPIRING_SOON', 'MATURED', 'OVERDUE'].includes(item.fdr.status);
  });

  const handleManualRunScheduler = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      runMaturityAndLifecycleScheduler(currentUser);
      setIsEvaluating(false);
      showToast(
        'Lifecycle Scheduler Executed',
        'Updated status indicators and generated regulatory reminder notifications.',
        'success'
      );
      onRefreshData();
    }, 400);
  };

  const handleSendMultiChannelDispatch = () => {
    if (!activeDispatchFdr) return;
    setIsDispatching(true);

    setTimeout(() => {
      addNotification({
        title: `Multi-Channel Alert Dispatched: ${activeDispatchFdr.fdrNumber}`,
        message: `Dispatched across [${dispatchChannel}] to ${activeDispatchFdr.institutionName} regarding upcoming maturity on ${activeDispatchFdr.maturityDate}.`,
        targetRole: 'ALL',
        targetInstitutionId: activeDispatchFdr.institutionId,
        type: 'EXPIRY_REMINDER',
        severity: 'CRITICAL',
        relatedFdrId: activeDispatchFdr.id,
      });

      setIsDispatching(false);
      showToast(
        'Multi-Channel Alerts Dispatched!',
        `Sent via ${dispatchChannel === 'ALL' ? 'Email, SMS Gateway & In-App' : dispatchChannel} to ${activeDispatchFdr.institutionName}.`,
        'success'
      );
      setActiveDispatchFdr(null);
    }, 500);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
              Autonomous Cadence
            </span>
            <span className="text-xs text-slate-400">SIH Problem Statement ID 26265</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black mt-1 text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Automated Maturity Tracking &amp; Multi-Channel Escalation Engine</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Multi-stage scheduled alerts across Email, SMS Gateway, and In-App channels. Auto-escalation with SLA enforcement from Institution &rarr; Regional Office &rarr; Bureau Head.
          </p>
        </div>

        <button
          onClick={handleManualRunScheduler}
          disabled={isEvaluating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs self-start sm:self-auto disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-blue-400 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Evaluating SLA Timers...' : 'Execute Lifecycle Scheduler'}</span>
        </button>
      </div>

      {/* 5-STAGE MULTI-CHANNEL CADENCE & SLA MATRIX */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-700" />
              <span>Statutory Alert Cadence &amp; Escalation Hierarchy</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configured automated notifications triggered before deposit maturity
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Active Policy: APH 2024-27
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          {/* Stage 1: 90 Days */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 text-xs font-mono">T-90 Days</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-200 text-blue-800">Stage 1</span>
              </div>
              <p className="font-bold text-slate-800 text-[11px] mt-1">Advance Advisory</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                Email notice to Registrar with renewal instructions.
              </p>
            </div>
            <div className="pt-2 border-t border-blue-200/60 text-[10px] text-blue-800 flex items-center gap-1">
              <Mail className="w-3 h-3 text-blue-600" />
              <span>Email Channel</span>
            </div>
          </div>

          {/* Stage 2: 60 Days */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900 text-xs font-mono">T-60 Days</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-200 text-indigo-800">Stage 2</span>
              </div>
              <p className="font-bold text-slate-800 text-[11px] mt-1">Formal Reminder</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                Dispatched to Trust President &amp; Principal.
              </p>
            </div>
            <div className="pt-2 border-t border-indigo-200/60 text-[10px] text-indigo-800 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <Smartphone className="w-3 h-3" />
              <span>Email + SMS</span>
            </div>
          </div>

          {/* Stage 3: 30 Days */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-900 text-xs font-mono">T-30 Days</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900">Stage 3</span>
              </div>
              <p className="font-bold text-slate-800 text-[11px] mt-1">Urgent Directive</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                Multi-channel blast with bank branch liaison copy.
              </p>
            </div>
            <div className="pt-2 border-t border-amber-200/60 text-[10px] text-amber-800 flex items-center gap-1 font-semibold">
              <Mail className="w-3 h-3" />
              <Smartphone className="w-3 h-3" />
              <BellRing className="w-3 h-3" />
              <span>All 3 Channels</span>
            </div>
          </div>

          {/* Stage 4: 15 Days */}
          <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-orange-900 text-xs font-mono">T-15 Days</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-200 text-orange-950">Level 2 Esc</span>
              </div>
              <p className="font-bold text-slate-800 text-[11px] mt-1">Regional Office SLA</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                Escalates to Regional Scrutiny Officer (SLA: 7 Days).
              </p>
            </div>
            <div className="pt-2 border-t border-orange-200/60 text-[10px] text-orange-900 flex items-center gap-1 font-bold">
              <Timer className="w-3 h-3 text-orange-600" />
              <span>7d SLA Enforced</span>
            </div>
          </div>

          {/* Stage 5: 7 Days & Overdue */}
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-rose-900 text-xs font-mono">T-7d / Matured</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-200 text-rose-950">Level 3 Esc</span>
              </div>
              <p className="font-bold text-rose-950 text-[11px] mt-1">Bureau Head HQ</p>
              <p className="text-[10px] text-rose-800 mt-0.5 leading-tight">
                Direct escalation to Bureau Head &amp; Member Secretary.
              </p>
            </div>
            <div className="pt-2 border-t border-rose-200 text-[10px] text-rose-900 flex items-center gap-1 font-black">
              <AlertOctagon className="w-3 h-3 text-rose-600" />
              <span>48h SLA Emergency</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Bucket Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bucket 1: Expiring Soon */}
        <button
          onClick={() => setActiveBucket(activeBucket === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeBucket === 'EXPIRING_SOON'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{expiringSoonList.length}</p>
          <p className="text-[11px] text-amber-800 mt-0.5">&le; 30 Days to Maturity</p>
        </button>

        {/* Bucket 2: Matured */}
        <button
          onClick={() => setActiveBucket(activeBucket === 'MATURED' ? 'ALL' : 'MATURED')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeBucket === 'MATURED'
              ? 'bg-orange-100/70 border-orange-400 ring-2 ring-orange-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-900 uppercase tracking-wider">Matured Deposits</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{maturedList.length}</p>
          <p className="text-[11px] text-orange-800 mt-0.5">Lock-in tenure concluded</p>
        </button>

        {/* Bucket 3: Overdue Escalated */}
        <button
          onClick={() => setActiveBucket(activeBucket === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            activeBucket === 'OVERDUE'
              ? 'bg-red-100/70 border-red-400 ring-2 ring-red-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-900 uppercase tracking-wider">Overdue Escalations</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{overdueList.length}</p>
          <p className="text-[11px] text-red-800 mt-0.5">&gt; {settings.overdueEscalationDays} Days past maturity</p>
        </button>
      </div>

      {/* Main Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-900">
              Live Maturity &amp; Escalation Queue ({displayedList.length} Records)
            </h4>
            <p className="text-[11px] text-slate-500">
              Real-time SLA status and multi-channel dispatch capabilities
            </p>
          </div>
          {activeBucket !== 'ALL' && (
            <button
              onClick={() => setActiveBucket('ALL')}
              className="text-xs text-blue-700 font-bold hover:underline cursor-pointer"
            >
              Clear Filter &rarr;
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">FDR Number</th>
                <th className="px-4 py-3">Institution Name</th>
                <th className="px-4 py-3">Bank &amp; Branch</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Maturity Date</th>
                <th className="px-4 py-3">Timeline Delta</th>
                <th className="px-4 py-3">Escalation Tier</th>
                <th className="px-4 py-3 text-center">Multi-Channel Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.map(({ fdr, diffDays, escalationTier, slaHours }) => (
                <tr key={fdr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {fdr.fdrNumber}
                    <span className="block text-[10px] text-slate-400 font-normal">{fdr.id}</span>
                  </td>

                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="font-semibold text-slate-800 line-clamp-1">{fdr.institutionName}</span>
                    <span className="text-[10px] text-slate-400">ID: {fdr.institutionId}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{fdr.bankName}</span>
                    <span className="block text-[10px] text-slate-400">{fdr.branchName || 'Main'}</span>
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(fdr.amount)}
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-800 font-mono">{fdr.maturityDate}</td>

                  <td className="px-4 py-3">
                    {diffDays < 0 ? (
                      <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
                        {Math.abs(diffDays)}d Overdue
                      </span>
                    ) : diffDays === 0 ? (
                      <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-[11px]">
                        Matures Today
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                        {diffDays}d Left
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {escalationTier === 'TIER_3_BUREAU_HEAD' ? (
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 block w-max">
                          Bureau Head (HQ)
                        </span>
                        <span className="text-[10px] font-mono text-rose-600 block">
                          SLA: 48h Countdown
                        </span>
                      </div>
                    ) : escalationTier === 'TIER_2_REGIONAL' ? (
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 block w-max">
                          Regional Office
                        </span>
                        <span className="text-[10px] font-mono text-amber-700 block">
                          SLA: 7d Timer
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200 block w-max">
                          Institution Signatory
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Standard Cadence
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectFdr(fdr.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDispatchFdr(fdr)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Simulate Multi-Channel Alert Dispatch (Email, SMS, In-App)"
                      >
                        <Send className="w-3 h-3 text-blue-600" />
                        <span>Send Alert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Channel Alert Dispatch Simulator Modal */}
      {activeDispatchFdr && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Multi-Channel Regulatory Dispatch
                  </h3>
                  <p className="text-xs text-slate-300">
                    Automated maturity reminder &amp; renewal directive
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDispatchFdr(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Target Instrument</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {activeDispatchFdr.fdrNumber}
                </p>
                <p className="text-slate-600 font-medium text-xs mt-0.5">
                  {activeDispatchFdr.institutionName}
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Maturity Date: <strong className="font-mono text-slate-800">{activeDispatchFdr.maturityDate}</strong>
                </p>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Select Notification Channel:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'ALL', label: 'All Channels', icon: BellRing },
                    { id: 'EMAIL', label: 'Email', icon: Mail },
                    { id: 'SMS', label: 'SMS Gateway', icon: Smartphone },
                    { id: 'IN_APP', label: 'In-App Notice', icon: MessageSquare },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSel = dispatchChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setDispatchChannel(ch.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-[10px] font-bold block">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 text-[10px] border-b border-slate-800 pb-1">
                  <span>DISPATCH PREVIEW ({dispatchChannel})</span>
                  <span>SENDER: AICTE-REG-NOTIFY</span>
                </div>
                <p className="text-amber-300">
                  URGENT: Statutory Security Deposit {activeDispatchFdr.fdrNumber} for {activeDispatchFdr.institutionName} matures on {activeDispatchFdr.maturityDate}.
                </p>
                <p className="text-slate-300 text-[10px]">
                  Under APH regulations, immediate renewal/rollover or replacement deposit must be executed via the AICTE FDR Portal within 15 days to prevent statutory notice.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveDispatchFdr(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendMultiChannelDispatch}
                disabled={isDispatching}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>{isDispatching ? 'Transmitting via Gateways...' : 'Send Alerts Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
