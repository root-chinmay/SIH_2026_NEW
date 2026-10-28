import React, { useState, useMemo } from 'react';
import { Institution, FDRRecord } from '../../types';
import { formatIndianCurrency, formatLakhs } from '../common/StatusBadge';
import {
  Building2,
  Search,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  FolderArchive,
  ArrowRight,
  ExternalLink,
  X,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface InstitutionDirectoryProps {
  institutions: Institution[];
  fdrs: FDRRecord[];
  onSelectFdr: (fdrId: string) => void;
}

export const InstitutionDirectory: React.FC<InstitutionDirectoryProps> = ({
  institutions,
  fdrs,
  onSelectFdr,
}) => {
  const { currentUser, isInstitutionUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(
    isInstitutionUser && currentUser.institutionId
      ? institutions.find((i) => i.id === currentUser.institutionId) || null
      : null
  );

  const filtered = useMemo(() => {
    return institutions.filter((inst) => {
      if (regionFilter !== 'ALL' && inst.aicteRegion !== regionFilter) return false;
      if (typeFilter !== 'ALL' && inst.type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = inst.name.toLowerCase().includes(q);
        const matchId = inst.aictePermanentId.toLowerCase().includes(q);
        const matchCity = inst.city.toLowerCase().includes(q);
        const matchState = inst.state.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCity && !matchState) return false;
      }
      return true;
    });
  }, [institutions, regionFilter, typeFilter, searchTerm]);

  // If user is institution user, lock to their profile by default
  const instFdrs = selectedInstitution
    ? fdrs.filter((f) => f.institutionId === selectedInstitution.id)
    : [];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            <span>AICTE Approved Institutions Directory</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {filtered.length} Institutions
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Technical and professional institutions under AICTE regulatory jurisdiction
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Institution Name, Permanent ID, City, or State..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All AICTE Regions</option>
            <option value="Western">Western Region</option>
            <option value="Northern">Northern Region</option>
            <option value="Southern">Southern Region</option>
            <option value="South-Western">South-Western Region</option>
            <option value="Central">Central Region</option>
            <option value="Eastern">Eastern Region</option>
            <option value="North-Western">North-Western Region</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All Institution Types</option>
            <option value="Engineering & Technology">Engineering & Technology</option>
            <option value="Management">Management</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Architecture & Town Planning">Architecture & Town Planning</option>
            <option value="Polytechnic Diploma">Polytechnic Diploma</option>
          </select>
        </div>
      </div>

      {/* Institution Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((inst) => {
          const instFdrsCount = fdrs.filter((f) => f.institutionId === inst.id).length;
          const totalVal = fdrs
            .filter((f) => f.institutionId === inst.id && ['ACTIVE', 'EXPIRING_SOON', 'MATURED'].includes(f.status))
            .reduce((s, f) => s + f.amount, 0);

          return (
            <div
              key={inst.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold block">
                        PID: {inst.aictePermanentId}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {inst.approvalStatus}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {inst.aicteRegion}
                  </span>
                </div>

                <h3 className="font-extrabold text-xs text-slate-900 mt-2 line-clamp-2 leading-snug">
                  {inst.name}
                </h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{inst.city}, {inst.state}</span>
                </p>

                <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Security Deposits:</span>
                    <span className="font-bold text-slate-800">{instFdrsCount} FDRs</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Active Custody:</span>
                    <span className="font-mono font-bold text-blue-900">{formatLakhs(totalVal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{inst.affiliationType}</span>
                <button
                  onClick={() => setSelectedInstitution(inst)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline"
                >
                  <span>Dossier Profile</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Institution Dossier Deep Dive Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedInstitution.name}</h3>
                  <p className="text-xs text-slate-600">
                    AICTE Permanent ID: {selectedInstitution.aictePermanentId} • {selectedInstitution.city}, {selectedInstitution.state}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInstitution(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Institutional Profile Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Category &amp; Affiliation</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{selectedInstitution.type}</span>
                  <span className="text-slate-500 text-[11px]">{selectedInstitution.affiliationType}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Authorized Signatory</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{selectedInstitution.authorizedPerson.name}</span>
                  <span className="text-slate-500 text-[11px]">{selectedInstitution.authorizedPerson.designation}</span>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                  <span className="text-blue-700 block text-[10px] uppercase font-bold">Total Security Deposit In Custody</span>
                  <span className="font-mono font-black text-blue-950 text-base mt-0.5 block">
                    {formatIndianCurrency(
                      instFdrs.reduce((s, f) => s + f.amount, 0)
                    )}
                  </span>
                  <span className="text-blue-700 text-[11px]">Across {instFdrs.length} Instruments</span>
                </div>
              </div>

              {/* Associated FDR Records Table */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Associated Fixed Deposit Receipts ({instFdrs.length})
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">FDR Number</th>
                        <th className="px-3 py-2.5">Bank &amp; Branch</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                        <th className="px-3 py-2.5">Maturity Date</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {instFdrs.map((fdr) => (
                        <tr key={fdr.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{fdr.fdrNumber}</td>
                          <td className="px-3 py-2.5">{fdr.bankName}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatIndianCurrency(fdr.amount)}
                          </td>
                          <td className="px-3 py-2.5">{fdr.maturityDate}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                              {fdr.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedInstitution(null);
                                onSelectFdr(fdr.id);
                              }}
                              className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                            >
                              Inspect FDR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedInstitution(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
