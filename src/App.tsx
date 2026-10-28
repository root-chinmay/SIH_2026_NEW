import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { OfficerLoginPage } from './components/auth/OfficerLoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { AicteDashboard } from './components/dashboard/AicteDashboard';
import { FdrRepository } from './components/fdrs/FdrRepository';
import { FdrDetailModal } from './components/fdrs/FdrDetailModal';
import { FdrSubmissionWizard } from './components/submission/FdrSubmissionWizard';
import { VerificationWorkspace } from './components/verification/VerificationWorkspace';
import { BankVerificationModal } from './components/verification/BankVerificationModal';
import { DiscrepancyManagement } from './components/discrepancies/DiscrepancyManagement';
import { ExpiryMonitoring } from './components/monitoring/ExpiryMonitoring';
import { RenewalManagement } from './components/renewals/RenewalManagement';
import { ReleaseRefundManagement } from './components/release/ReleaseRefundManagement';
import { InstitutionDirectory } from './components/institutions/InstitutionDirectory';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { AuditTrailViewer } from './components/audit/AuditTrailViewer';
import { SecurityDashboard } from './components/security/SecurityDashboard';
import { AdminSettings } from './components/settings/AdminSettings';
import {
  getFdrs,
  getInstitutions,
  getDiscrepancies,
  getNotifications,
  getFdrById,
  initializeStorage,
} from './services/storage';
import { FDRRecord, Institution, Discrepancy, NotificationItem } from './types';

const MainPortal: React.FC = () => {
  const { currentUser, isInstitutionUser } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedFdrId, setSelectedFdrId] = useState<string | null>(null);
  const [bankVerificationFdr, setBankVerificationFdr] = useState<FDRRecord | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [repositoryInitialFilter, setRepositoryInitialFilter] = useState('ALL');

  // Load state from persistent storage
  const loadPortalData = useCallback(() => {
    initializeStorage();
    setFdrs(getFdrs());
    setInstitutions(getInstitutions());
    setDiscrepancies(getDiscrepancies());
    setNotifications(getNotifications());
  }, []);

  useEffect(() => {
    loadPortalData();

    // Event listeners for reactive cross-component state updates
    const handleFdrsUpdate = () => loadPortalData();
    const handleDiscrepanciesUpdate = () => loadPortalData();
    const handleNotifsUpdate = () => setNotifications(getNotifications());
    const handleDbReset = () => loadPortalData();

    window.addEventListener('aicte_fdrs_updated', handleFdrsUpdate);
    window.addEventListener('aicte_discrepancies_updated', handleDiscrepanciesUpdate);
    window.addEventListener('aicte_notifications_updated', handleNotifsUpdate);
    window.addEventListener('aicte_database_reset', handleDbReset);

    return () => {
      window.removeEventListener('aicte_fdrs_updated', handleFdrsUpdate);
      window.removeEventListener('aicte_discrepancies_updated', handleDiscrepanciesUpdate);
      window.removeEventListener('aicte_notifications_updated', handleNotifsUpdate);
      window.removeEventListener('aicte_database_reset', handleDbReset);
    };
  }, [loadPortalData]);

  // Selected FDR object for Modal
  const activeFdr = selectedFdrId ? getFdrById(selectedFdrId) || null : null;

  // Counts for sidebar badges
  const pendingVerificationCount = fdrs.filter(
    (f) => f.status === 'PENDING_VERIFICATION' || f.status === 'UNDER_REVIEW'
  ).length;
  const openDiscrepanciesCount = discrepancies.filter(
    (d) => d.status === 'OPEN' || d.status === 'AWAITING_INSTITUTION' || d.status === 'UNDER_REVIEW'
  ).length;
  const expiringCount = fdrs.filter((f) => f.status === 'EXPIRING_SOON').length;
  const pendingReleaseCount = fdrs.filter(
    (f) => f.status === 'RELEASE_REQUESTED' || f.status === 'RELEASE_APPROVED'
  ).length;

  const unreadNotificationsCount = notifications.filter((n) => {
    if (currentUser.role === 'ADMIN') return !n.isRead;
    if (n.targetRole === 'ALL') return !n.isRead;
    if (n.targetRole === currentUser.role) return !n.isRead;
    if (n.targetInstitutionId && n.targetInstitutionId === currentUser.institutionId) return !n.isRead;
    return false;
  }).length;

  // Protect against unprivileged tab access
  useEffect(() => {
    if (isInstitutionUser && currentTab === 'verification') {
      setCurrentTab('dashboard');
    }
  }, [isInstitutionUser, currentTab]);

  const handleGlobalSearch = (term: string) => {
    setCurrentTab('fdrs');
  };

  const handleNavigateTab = (tab: NavigationTab, filterParams?: any) => {
    if (filterParams?.status) {
      setRepositoryInitialFilter(filterParams.status);
    }
    if (tab === 'verification' && isInstitutionUser) {
      setCurrentTab('fdrs');
      return;
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBankVerification = (fdr: FDRRecord) => {
    if (isInstitutionUser) return;
    setBankVerificationFdr(fdr);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Official Government Navbar */}
      <Navbar
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onGlobalSearch={handleGlobalSearch}
        onSelectFdr={(id) => setSelectedFdrId(id)}
      />

      {/* Main Body: Sidebar + Dynamic Content Canvas */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          pendingVerificationCount={pendingVerificationCount}
          openDiscrepanciesCount={openDiscrepanciesCount}
          expiringCount={expiringCount}
          pendingReleaseCount={pendingReleaseCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {/* DASHBOARD */}
          {currentTab === 'dashboard' && (
            <AicteDashboard
              fdrs={fdrs}
              institutions={institutions}
              discrepancies={discrepancies}
              onNavigateTab={handleNavigateTab}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onOpenBankVerification={handleOpenBankVerification}
            />
          )}

          {/* FDR REPOSITORY */}
          {currentTab === 'fdrs' && (
            <FdrRepository
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onInitiateSubmit={() => setCurrentTab('submit')}
              onOpenBankVerification={handleOpenBankVerification}
              initialFilter={repositoryInitialFilter}
            />
          )}

          {/* SUBMIT NEW FDR */}
          {currentTab === 'submit' && (
            <FdrSubmissionWizard
              institutions={institutions}
              onSubmissionSuccess={(id) => {
                loadPortalData();
                setSelectedFdrId(id);
                setCurrentTab('fdrs');
              }}
              onCancel={() => setCurrentTab('fdrs')}
            />
          )}

          {/* SCRUTINY & VERIFICATION */}
          {currentTab === 'verification' && (
            <VerificationWorkspace
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onRefreshList={loadPortalData}
              onOpenBankVerification={handleOpenBankVerification}
            />
          )}

          {/* DISCREPANCY MANAGEMENT */}
          {currentTab === 'discrepancies' && (
            <DiscrepancyManagement
              discrepancies={discrepancies}
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onRefreshData={loadPortalData}
            />
          )}

          {/* EXPIRY & MATURITY MONITORING */}
          {currentTab === 'monitoring' && (
            <ExpiryMonitoring
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onRefreshData={loadPortalData}
            />
          )}

          {/* RENEWAL & REPLACEMENT */}
          {currentTab === 'renewals' && (
            <RenewalManagement
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onRefreshData={loadPortalData}
            />
          )}

          {/* RELEASE / REFUND */}
          {currentTab === 'release' && (
            <ReleaseRefundManagement
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
              onRefreshData={loadPortalData}
            />
          )}

          {/* INSTITUTIONS DIRECTORY */}
          {currentTab === 'institutions' && (
            <InstitutionDirectory
              institutions={institutions}
              fdrs={fdrs}
              onSelectFdr={(id) => setSelectedFdrId(id)}
            />
          )}

          {/* REPORTS */}
          {currentTab === 'reports' && (
            <ReportsCenter
              fdrs={fdrs}
              institutions={institutions}
              discrepancies={discrepancies}
            />
          )}

          {/* AUDIT TRAIL */}
          {currentTab === 'audit' && <AuditTrailViewer />}

          {/* SECURITY DASHBOARD */}
          {currentTab === 'security' && <SecurityDashboard />}

          {/* ADMIN SETTINGS */}
          {currentTab === 'settings' && (
            <AdminSettings onRefreshData={loadPortalData} />
          )}
        </main>
      </div>

      {/* Deep FDR Detail Modal */}
      {selectedFdrId && (
        <FdrDetailModal
          fdr={activeFdr}
          onClose={() => setSelectedFdrId(null)}
          onRefreshFdr={(id) => {
            loadPortalData();
          }}
          onOpenBankVerification={handleOpenBankVerification}
        />
      )}

      {/* Interactive Bank Verification Modal */}
      {bankVerificationFdr && (
        <BankVerificationModal
          fdr={bankVerificationFdr}
          onClose={() => setBankVerificationFdr(null)}
          onSuccess={() => {
            loadPortalData();
            setBankVerificationFdr(null);
          }}
        />
      )}

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onSelectFdr={(id) => {
          setSelectedFdrId(id);
          setCurrentTab('fdrs');
        }}
      />
    </div>
  );
};

const PortalRoot: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <OfficerLoginPage />;
  }

  return <MainPortal />;
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PortalRoot />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
