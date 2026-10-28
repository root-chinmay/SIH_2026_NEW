import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building,
  FolderArchive,
  FilePlus2,
  CheckSquare,
  AlertCircle,
  ClockAlert,
  Repeat,
  ArrowUpRightSquare,
  BarChart3,
  History,
  ShieldAlert,
  Settings,
  HelpCircle,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'institutions'
  | 'fdrs'
  | 'submit'
  | 'verification'
  | 'discrepancies'
  | 'monitoring'
  | 'renewals'
  | 'release'
  | 'reports'
  | 'audit'
  | 'security'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  pendingVerificationCount: number;
  openDiscrepanciesCount: number;
  expiringCount: number;
  pendingReleaseCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingVerificationCount,
  openDiscrepanciesCount,
  expiringCount,
  pendingReleaseCount,
}) => {
  const { currentUser, canVerify, canSubmit, canManageSettings, isInstitutionUser } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'institutions' as NavigationTab,
      label: isInstitutionUser ? 'My Institution Profile' : 'Institutions Directory',
      icon: Building,
      show: true,
    },
    {
      id: 'fdrs' as NavigationTab,
      label: isInstitutionUser ? 'My FDRs & Deposits' : 'FDR Repository',
      icon: FolderArchive,
      show: true,
    },
    {
      id: 'submit' as NavigationTab,
      label: 'Submit New FDR',
      icon: FilePlus2,
      show: canSubmit,
      highlight: true,
    },
    {
      id: 'verification' as NavigationTab,
      label: 'Scrutiny & Verification',
      icon: CheckSquare,
      show: canVerify,
      badge: pendingVerificationCount,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'discrepancies' as NavigationTab,
      label: 'Discrepancy Desk',
      icon: AlertCircle,
      show: true,
      badge: openDiscrepanciesCount,
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      id: 'monitoring' as NavigationTab,
      label: 'Expiry & Maturity Alerts',
      icon: ClockAlert,
      show: true,
      badge: expiringCount,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'renewals' as NavigationTab,
      label: 'Renewal & Replacement',
      icon: Repeat,
      show: true,
    },
    {
      id: 'release' as NavigationTab,
      label: 'Release / Refund Workflow',
      icon: ArrowUpRightSquare,
      show: true,
      badge: pendingReleaseCount,
      badgeColor: 'bg-purple-600 text-white',
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Official Reports & Exports',
      icon: BarChart3,
      show: true,
    },
    {
      id: 'audit' as NavigationTab,
      label: 'Audit Trail Register',
      icon: History,
      show: currentUser.role !== 'INSTITUTION',
    },
    {
      id: 'security' as NavigationTab,
      label: 'Security & Access Logs',
      icon: ShieldAlert,
      show: currentUser.role === 'ADMIN' || currentUser.role === 'AUDITOR',
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Admin Settings & Policies',
      icon: Settings,
      show: canManageSettings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-80px)] border-r border-slate-800">
      {/* User Info Capsule */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {currentUser.name.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentUser.designation}</p>
          </div>
        </div>
        <div className="mt-2 text-[10px] bg-slate-800/80 px-2 py-1 rounded text-slate-300 flex items-center justify-between border border-slate-700">
          <span className="font-semibold uppercase tracking-wider text-amber-300">{currentUser.role}</span>
          <span className="text-slate-400">Auth Tier-1</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-xs font-semibold'
                    : item.highlight
                    ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-700 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Bottom Legal / Help footer */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-between text-slate-400 hover:text-slate-200 cursor-pointer">
          <span className="font-semibold text-slate-300">APH 2024-27 Norms</span>
          <HelpCircle className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Smart India Hackathon 2026</p>
      </div>
    </aside>
  );
};
