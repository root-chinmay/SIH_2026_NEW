import React, { useState, useMemo } from 'react';
import { FDRRecord } from '../../types';
import { StatusBadge, formatIndianCurrency } from '../common/StatusBadge';
import {
  Search,
  Filter,
  Download,
  Eye,
  FileCheck2,
  RefreshCw,
  ArrowUpDown,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FdrQrModal } from '../common/FdrQrModal';

interface FdrRepositoryProps {
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
  onInitiateSubmit?: () => void;
  onOpenBankVerification?: (fdr: FDRRecord) => void;
  initialFilter?: string;
}

export const FdrRepository: React.FC<FdrRepositoryProps> = ({
  fdrs,
  onSelectFdr,
  onInitiateSubmit,
  onOpenBankVerification,
  initialFilter = 'ALL',
}) => {
  const { currentUser, isInstitutionUser, canVerify, canApprove } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'maturityDate' | 'amount' | 'submittedAt' | 'fdrNumber'>('maturityDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [qrFdr, setQrFdr] = useState<FDRRecord | null>(null);
  const itemsPerPage = 8;

  // Filter scoped to institution if user is an institution
  const scopedFdrs = useMemo(() => {
    if (isInstitutionUser && currentUser.institutionId) {
      return fdrs.filter((f) => f.institutionId === currentUser.institutionId);
    }
    return fdrs;
  }, [fdrs, isInstitutionUser, currentUser]);

  // Unique banks for filter
  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    scopedFdrs.forEach((f) => set.add(f.bankName));
    return Array.from(set).sort();
  }, [scopedFdrs]);

  // Filtered & Sorted FDRs
  const filteredFdrs = useMemo(() => {
    return scopedFdrs
      .filter((fdr) => {
        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'DISCREPANCY') {
            if (!fdr.discrepancies || fdr.discrepancies.length === 0) return false;
          } else if (fdr.status !== statusFilter) {
            return false;
          }
        }

        // Bank filter
        if (bankFilter !== 'ALL' && fdr.bankName !== bankFilter) {
          return false;
        }

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNumber = fdr.fdrNumber.toLowerCase().includes(q);
          const matchId = fdr.id.toLowerCase().includes(q);
          const matchInst = fdr.institutionName.toLowerCase().includes(q);
          const matchBank = fdr.bankName.toLowerCase().includes(q);
          const matchBranch = fdr.branchName.toLowerCase().includes(q);
          if (!matchNumber && !matchId && !matchInst && !matchBank && !matchBranch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'amount') {
          diff = a.amount - b.amount;
        } else if (sortBy === 'maturityDate') {
          diff = new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
        } else if (sortBy === 'submittedAt') {
          diff = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        } else if (sortBy === 'fdrNumber') {
          diff = a.fdrNumber.localeCompare(b.fdrNumber);
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [scopedFdrs, statusFilter, bankFilter, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredFdrs.length / itemsPerPage) || 1;
  const paginatedFdrs = filteredFdrs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // CSV Export Function
  const handleExportCSV = () => {
    const headers = [
      'Internal ID',
      'FDR Number',
      'Institution Name',
      'Institution ID',
      'Bank Name',
      'Branch',
      'IFSC Code',
      'Amount (INR)',
      'Issue Date',
      'Maturity Date',
      'Status',
      'Verification Status',
      'Instrument Type',
    ];

    const rows = filteredFdrs.map((f) => [
      f.id,
      `"${f.fdrNumber}"`,
      `"${f.institutionName}"`,
      f.institutionId,
      `"${f.bankName}"`,
      `"${f.branchName}"`,
      f.ifscCode,
      f.amount,
      f.issueDate,
      f.maturityDate,
      f.status,
      f.verificationStatus,
      `"${f.instrumentType}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AICTE_FDR_Repository_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Central Security Deposit &amp; FDR Repository</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {filteredFdrs.length} Records
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isInstitutionUser
              ? `Authorized institutional view for ${currentUser.institutionName}`
              : 'Regulatory Bureau repository of all technical education security deposits'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download CSV dataset"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {onInitiateSubmit && (
            <button
              onClick={onInitiateSubmit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-2xs"
            >
              <span>+ Submit New FDR</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Status Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Deposits' },
            { id: 'ACTIVE', label: 'Active & Valid' },
            { id: 'PENDING_VERIFICATION', label: 'Pending Scrutiny' },
            { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
            { id: 'MATURED', label: 'Matured' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'REPLACED', label: 'Replaced / Renewal' },
            { id: 'RELEASE_REQUESTED', label: 'Release Requests' },
            { id: 'RELEASED', label: 'Released' },
            { id: 'DISCREPANCY', label: 'Discrepancies' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Bank Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by FDR No, Institution, Bank, or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div>
            <select
              value={bankFilter}
              onChange={(e) => {
                setBankFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
            >
              <option value="ALL">All Banking Institutions</option>
              {uniqueBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-800"
            >
              <option value="maturityDate">Sort: Maturity Date</option>
              <option value="amount">Sort: Deposit Amount</option>
              <option value="submittedAt">Sort: Submission Date</option>
              <option value="fdrNumber">Sort: FDR Number</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-600"
              title="Toggle Ascending / Descending"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {paginatedFdrs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No FDR records match current criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your search terms or filter parameters. You can search by FDR receipt number, institution name, bank, or permanent ID.
            </p>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setBankFilter('ALL');
                setSearchTerm('');
              }}
              className="mt-3 text-xs font-bold text-blue-700 hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">FDR Number &amp; Ref</th>
                  <th className="px-4 py-3">Institution Name</th>
                  <th className="px-4 py-3">Bank &amp; Branch</th>
                  <th className="px-4 py-3 text-right">Deposit Amount</th>
                  <th className="px-4 py-3">Maturity Schedule</th>
                  <th className="px-4 py-3">Lifecycle Status</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedFdrs.map((fdr) => (
                  <tr key={fdr.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{fdr.fdrNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{fdr.id}</span>
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="font-semibold text-slate-800 line-clamp-1" title={fdr.institutionName}>
                        {fdr.institutionName}
                      </span>
                      <span className="text-[10px] text-slate-400">ID: {fdr.institutionId}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900 block">{fdr.bankName}</span>
                      <span className="text-[10px] text-slate-400">{fdr.branchName || 'Main Branch'}</span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs block">
                        {formatIndianCurrency(fdr.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">{fdr.instrumentType.split(' ')[0]}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 block">{fdr.maturityDate}</span>
                      <span className="text-[10px] text-slate-400">Issued: {fdr.issueDate}</span>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={fdr.status} size="sm" />
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={fdr.verificationStatus} size="sm" />
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQrFdr(fdr)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 transition-colors cursor-pointer"
                          title="View and verify cryptographically signed QR Seal"
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-700" />
                          <span>QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectFdr(fdr.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
                          title="View complete dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        {onOpenBankVerification && !isInstitutionUser && (canVerify || canApprove) && (
                          <button
                            type="button"
                            onClick={() => onOpenBankVerification(fdr)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                            title="Execute Bank Verification (CBS)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verify (CBS)</span>
                          </button>
                        )}

                        {isInstitutionUser && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded border border-slate-200"
                            title="Approval restricted to AICTE Approving Authority"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${fdr.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                            {fdr.status === 'ACTIVE' ? 'Approved' : 'Awaiting Approval'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {filteredFdrs.length > itemsPerPage && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredFdrs.length)}</span> of{' '}
              <span className="font-bold">{filteredFdrs.length}</span> records
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs"
              >
                Previous
              </button>
              <span className="px-3 py-1 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
