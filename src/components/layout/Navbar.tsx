import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Search,
  Shield,
  UserCheck,
  Building2,
  RefreshCw,
  LogOut,
  Sliders,
  CheckCircle2,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { runMaturityAndLifecycleScheduler, resetToSeedData } from '../../services/storage';
import { useToast } from '../../context/ToastContext';
import { SecurityConfirmModal } from '../common/SecurityConfirmModal';

interface NavbarProps {
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onGlobalSearch: (term: string) => void;
  onSelectFdr?: (fdrId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifications,
  unreadNotificationsCount,
  onGlobalSearch,
}) => {
  const { currentUser, allDemoUsers, switchUser, logout } = useAuth();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onGlobalSearch(searchTerm.trim());
    }
  };

  const handleTriggerScheduler = () => {
    const res = runMaturityAndLifecycleScheduler(currentUser);
    setSchedulerStatus(`Checked ${res.checkedCount} FDRs: ${res.expiringCount} Expiring, ${res.maturedCount} Matured, ${res.overdueCount} Overdue.`);
    showToast('Scheduler Complete', `Evaluated ${res.checkedCount} FDRs against lifecycle maturity rules.`, 'info');
    setTimeout(() => setSchedulerStatus(null), 4500);
  };

  const handleResetData = () => {
    setIsResetModalOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'INSTITUTION':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'OFFICER':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'APPROVER':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'ADMIN':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'AUDITOR':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Gov Tricolor & Meta Strip */}
      <div className="bg-gradient-to-r from-orange-600 via-white to-emerald-700 h-1"></div>
      
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white tracking-wider flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>
              GOVERNMENT OF INDIA
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300 hidden md:inline">Ministry of Education</span>
            <span className="text-slate-400 hidden md:inline">|</span>
            <span className="text-slate-300 hidden sm:inline">All India Council for Technical Education (AICTE)</span>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded text-[11px] text-amber-300 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>Audit System Date: 25 Oct 2026 (IST)</span>
            </div>
            <button
              onClick={handleTriggerScheduler}
              title="Execute Automated Maturity & Validity Background Check"
              className="flex items-center gap-1 hover:text-white transition-colors bg-blue-900/60 hover:bg-blue-800 text-blue-200 px-2 py-0.5 rounded border border-blue-700/50"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Run Scheduler</span>
            </button>
            <button
              onClick={handleResetData}
              title="Restore demo baseline seed state"
              className="text-slate-400 hover:text-white transition-colors text-[11px] underline"
            >
              Reset Seed Data
            </button>
          </div>
        </div>
      </div>

      {schedulerStatus && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-900 px-4 py-1.5 text-xs flex items-center justify-between transition-all">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium">{schedulerStatus}</span>
          </div>
        </div>
      )}

      {/* Main Official Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-950 text-white flex items-center justify-center font-serif font-black text-xl shadow-xs border border-blue-800 shrink-0">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-tight">
                  AICTE Security Deposit &amp; FDR Portal
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-sm bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                  PS ID: 26265
                </span>
              </div>
              <p className="text-xs text-slate-600 hidden sm:block">
                Regulation Bureau • Digital Verification, Maturity Monitoring &amp; Release
              </p>
            </div>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search FDR No., Institution Name, Bank or Permanent ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </form>

          {/* Right Controls: Role Switcher & Notifications */}
          <div className="flex items-center gap-3">
            {/* Quick Role Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-all shadow-2xs ${getRoleBadgeColor(
                  currentUser.role
                )}`}
                title="Switch role for evaluation and testing"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{currentUser.role}:</span>
                <span className="font-bold truncate max-w-[120px] sm:max-w-none">{currentUser.name.split(' ')[0]}</span>
                <Sliders className="w-3.5 h-3.5 opacity-70" />
              </button>

              {/* Role Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      SIH Demo Persona Switcher
                    </p>
                    <p className="text-xs text-slate-600">
                      Instantly test the portal under different authorization roles:
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {allDemoUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-start gap-2.5 ${
                          currentUser.id === user.id ? 'bg-blue-50/70' : ''
                        }`}
                      >
                        <div className="mt-0.5">
                          {user.role === 'INSTITUTION' ? (
                            <Building2 className="w-4 h-4 text-amber-600" />
                          ) : user.role === 'OFFICER' ? (
                            <FileCheck2 className="w-4 h-4 text-blue-600" />
                          ) : user.role === 'APPROVER' ? (
                            <Shield className="w-4 h-4 text-purple-600" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-xs text-slate-900 truncate">{user.name}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                              {user.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate">{user.designation}</p>
                          <div className="mt-1">
                            {user.role === 'APPROVER' ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                Sole Approving Authority • Statutory Signoff
                              </span>
                            ) : user.role === 'OFFICER' ? (
                              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Scrutiny Maker • CBS Checks &amp; Forensic Review
                              </span>
                            ) : user.role === 'INSTITUTION' ? (
                              <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Submitter Only • No Approval Rights
                              </span>
                            ) : user.role === 'ADMIN' ? (
                              <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Administrator • Full System Access
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                Auditor • Read-Only Compliance
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                      }}
                      className="w-full py-1.5 px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit to Officer Login Gateway</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Notifications & Regulatory Alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Direct Logout Button */}
            <button
              onClick={logout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Sign Out to Officer Portals"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden lg:inline text-rose-700">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <SecurityConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Baseline Demo Records"
        actionName="RESET_BASELINE_DEMO"
        targetEntityId="SYSTEM_SEED_DATA"
        severity="CRITICAL"
        description="All modified FDRs, verification records, and discrepancies will be restored to the official Smart India Hackathon 2026 seed baseline."
        onSuccess={() => {
          setIsResetModalOpen(false);
          resetToSeedData(currentUser);
          showToast('Portal Reset', 'Portal records restored successfully to baseline demo data.', 'success');
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </header>
  );
};
