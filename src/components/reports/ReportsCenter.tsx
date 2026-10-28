import React, { useState, useMemo } from 'react';
import { FDRRecord, Institution, Discrepancy, AuditLogItem } from '../../types';
import { formatIndianCurrency, formatLakhs } from '../common/StatusBadge';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Building2,
  Filter,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { getAuditLogs } from '../../services/auditService';

interface ReportsCenterProps {
  fdrs: FDRRecord[];
  institutions: Institution[];
  discrepancies: Discrepancy[];
}

export type ReportCategory =
  | 'STATUS_SUMMARY'
  | 'EXPIRING_FDRS'
  | 'MATURED_FDRS'
  | 'PENDING_VERIFICATION'
  | 'DISCREPANCIES'
  | 'RENEWALS'
  | 'RELEASE_REFUND'
  | 'INSTITUTION_WISE'
  | 'AUDIT_LOGS';

export const ReportsCenter: React.FC<ReportsCenterProps> = ({
  fdrs,
  institutions,
  discrepancies,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportCategory>('STATUS_SUMMARY');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  const auditLogs = useMemo(() => getAuditLogs(), []);

  // Filter FDRs by date range
  const dateFilteredFdrs = useMemo(() => {
    return fdrs.filter((f) => {
      const d = f.submittedAt ? f.submittedAt.slice(0, 10) : f.issueDate;
      return d >= startDate && d <= endDate;
    });
  }, [fdrs, startDate, endDate]);

  // Compute table data based on report category
  const reportData = useMemo(() => {
    switch (selectedReport) {
      case 'EXPIRING_FDRS':
        return dateFilteredFdrs.filter((f) => f.status === 'EXPIRING_SOON');
      case 'MATURED_FDRS':
        return dateFilteredFdrs.filter((f) => f.status === 'MATURED' || f.status === 'OVERDUE');
      case 'PENDING_VERIFICATION':
        return dateFilteredFdrs.filter((f) => f.status === 'PENDING_VERIFICATION' || f.status === 'UNDER_REVIEW');
      case 'RENEWALS':
        return dateFilteredFdrs.filter((f) => f.renewalChain !== undefined || f.status === 'REPLACED');
      case 'RELEASE_REFUND':
        return dateFilteredFdrs.filter((f) => f.releaseRequest !== undefined || f.status === 'RELEASED');
      case 'STATUS_SUMMARY':
      default:
        return dateFilteredFdrs;
    }
  }, [selectedReport, dateFilteredFdrs]);

  // CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let fileName = `AICTE_${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (selectedReport === 'DISCREPANCIES') {
      headers = ['Discrepancy ID', 'FDR No', 'Institution', 'Type', 'Severity', 'Status', 'Detected Date', 'Assigned Officer'];
      rows = discrepancies.map((d) => [
        d.id,
        `"${d.fdrNumber}"`,
        `"${d.institutionName}"`,
        d.type,
        d.severity,
        d.status,
        d.detectedAt,
        `"${d.assignedOfficer}"`,
      ]);
    } else if (selectedReport === 'INSTITUTION_WISE') {
      headers = ['Permanent ID', 'Institution Name', 'Region', 'State', 'Total FDRs', 'Active Amount (INR)'];
      rows = institutions.map((i) => [
        i.aictePermanentId,
        `"${i.name}"`,
        i.aicteRegion,
        i.state,
        i.totalFdrCount,
        i.activeFdrAmount,
      ]);
    } else if (selectedReport === 'AUDIT_LOGS') {
      headers = ['Log ID', 'Timestamp', 'Actor Name', 'Role', 'Action', 'Entity', 'Description'];
      rows = auditLogs.map((a) => [
        a.id,
        a.timestamp,
        `"${a.userName}"`,
        a.userRole,
        a.action,
        a.entity,
        `"${a.description}"`,
      ]);
    } else {
      headers = ['FDR Number', 'Institution Name', 'Bank Name', 'Amount (INR)', 'Issue Date', 'Maturity Date', 'Status', 'Verification'];
      rows = reportData.map((f) => [
        `"${f.fdrNumber}"`,
        `"${f.institutionName}"`,
        `"${f.bankName}"`,
        f.amount,
        f.issueDate,
        f.maturityDate,
        f.status,
        f.verificationStatus,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-700" />
            <span>AICTE Regulatory Reports &amp; Audit Exports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate official executive intelligence reports with real-time database queries and CSV/Print exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Dossier</span>
          </button>
        </div>
      </div>

      {/* Report Types Selector */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          {[
            { id: 'STATUS_SUMMARY', label: 'FDR Status Master Report' },
            { id: 'EXPIRING_FDRS', label: 'Upcoming Maturities Report' },
            { id: 'MATURED_FDRS', label: 'Matured & Overdue Report' },
            { id: 'PENDING_VERIFICATION', label: 'Pending Scrutiny Report' },
            { id: 'DISCREPANCIES', label: 'Discrepancy Audit Register' },
            { id: 'RENEWALS', label: 'Renewal & Lineage Report' },
            { id: 'RELEASE_REFUND', label: 'Release / Refund Report' },
            { id: 'INSTITUTION_WISE', label: 'Institution-wise Custody Report' },
            { id: 'AUDIT_LOGS', label: 'Regulatory Audit Register' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedReport(tab.id as ReportCategory)}
              className={`px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-all ${
                selectedReport === tab.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Reporting Window:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Generated Report Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              {selectedReport.replace('_', ' ')}
            </h3>
            <p className="text-[11px] text-slate-500">Live query generated from current regulatory datastore</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {selectedReport === 'DISCREPANCIES' ? (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Discrepancy ID</th>
                  <th className="px-4 py-3">FDR Number</th>
                  <th className="px-4 py-3">Institution Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discrepancies.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold">{d.id}</td>
                    <td className="px-4 py-3 font-mono">{d.fdrNumber}</td>
                    <td className="px-4 py-3 font-semibold">{d.institutionName}</td>
                    <td className="px-4 py-3">{d.type}</td>
                    <td className="px-4 py-3">{d.severity}</td>
                    <td className="px-4 py-3">{d.status}</td>
                    <td className="px-4 py-3">{d.detectedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : selectedReport === 'INSTITUTION_WISE' ? (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Permanent ID</th>
                  <th className="px-4 py-3">Institution Name</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-center">FDR Count</th>
                  <th className="px-4 py-3 text-right">Active Custody Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutions.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold">{i.aictePermanentId}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{i.name}</td>
                    <td className="px-4 py-3">{i.aicteRegion}</td>
                    <td className="px-4 py-3">{i.state}</td>
                    <td className="px-4 py-3 text-center font-bold">{i.totalFdrCount}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                      {formatIndianCurrency(i.activeFdrAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : selectedReport === 'AUDIT_LOGS' ? (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor &amp; Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 20).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px]">{a.timestamp}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{a.userName}</span>
                      <span className="block text-[10px] text-slate-400">{a.userRole}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-900">{a.action}</td>
                    <td className="px-4 py-3">{a.entity}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-md">{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-4 py-3">FDR Number</th>
                  <th className="px-4 py-3">Institution Name</th>
                  <th className="px-4 py-3">Depository Bank</th>
                  <th className="px-4 py-3 text-right">Deposit Amount</th>
                  <th className="px-4 py-3">Maturity Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((fdr) => (
                  <tr key={fdr.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{fdr.fdrNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{fdr.institutionName}</td>
                    <td className="px-4 py-3">{fdr.bankName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatIndianCurrency(fdr.amount)}
                    </td>
                    <td className="px-4 py-3 font-medium">{fdr.maturityDate}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {fdr.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
