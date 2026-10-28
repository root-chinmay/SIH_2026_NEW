import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FDRRecord } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Printer,
  Copy,
  ExternalLink,
  Lock,
  Building2,
  Calendar,
  AlertTriangle,
  QrCode,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { formatIndianCurrency } from './StatusBadge';
import { generateFdrQrPayload, maskAccountNumber } from '../../services/securityService';
import { useToast } from '../../context/ToastContext';

interface FdrQrModalProps {
  fdr: FDRRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FdrQrModal: React.FC<FdrQrModalProps> = ({ fdr, isOpen, onClose }) => {
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!fdr) return;
    const payload = generateFdrQrPayload(fdr);
    const jsonString = JSON.stringify(payload);

    QRCode.toDataURL(jsonString, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [fdr]);

  if (!isOpen || !fdr) return null;

  const payload = generateFdrQrPayload(fdr);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(payload.verifyUrl);
    setCopied(true);
    showToast('Verification URL Copied', 'Public verification link copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  AICTE Tamper-Proof QR
                </span>
                <span className="text-[11px] text-slate-300 font-mono">APH 2024-27</span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white mt-0.5">
                Official FDR Verification Seal
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* QR Display Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for FDR ${fdr.fdrNumber}`}
                  className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center bg-slate-100 rounded-lg animate-pulse text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <span>Digitally Authenticated Certificate</span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 font-mono">
                  {fdr.fdrNumber}
                </h4>
                <p className="text-slate-600 font-medium text-xs mt-0.5 line-clamp-1">
                  {fdr.institutionName}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {fdr.institutionId}
                </p>
              </div>

              <div className="pt-1 text-[11px] text-slate-500">
                <p className="flex items-center justify-center sm:justify-start gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Masked No: {maskAccountNumber(fdr.fdrNumber)}</span>
                </p>
                <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                  Seal: {payload.authSeal}
                </p>
              </div>
            </div>
          </div>

          {/* Core Verification Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Current Status</p>
              <p className="font-black text-xs text-slate-900 mt-1 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    fdr.status === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : fdr.status === 'EXPIRING_SOON'
                      ? 'bg-amber-500'
                      : fdr.status === 'MATURED'
                      ? 'bg-orange-500'
                      : 'bg-blue-500'
                  }`}
                />
                {fdr.status.replace('_', ' ')}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Deposit Amount</p>
              <p className="font-black text-xs text-slate-900 mt-1 font-mono">
                {formatIndianCurrency(fdr.amount)}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Maturity Date</p>
              <p className="font-bold text-xs text-slate-900 mt-1 font-mono">
                {fdr.maturityDate}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Depository Bank &amp; Branch</p>
              <p className="font-semibold text-xs text-slate-900 mt-1 truncate">
                {fdr.bankName} • {fdr.branchName || 'Main Branch'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</p>
              <p className="font-bold text-xs text-slate-900 mt-1 font-mono">
                {fdr.ifscCode || 'SBIN0001001'}
              </p>
            </div>
          </div>

          {/* Statutory Lien Confirmation */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950 text-xs">
                  Statutory Lien Stamped in Favor of AICTE
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Lien Holder: <span className="font-semibold text-slate-900">{fdr.jointHolderName || 'Member Secretary, AICTE New Delhi'}</span>
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  No premature encashment or modification permitted without official AICTE sanction order.
                </p>
              </div>
            </div>
          </div>

          {/* Renewal & Rollover History */}
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>Renewal &amp; Rollover History</span>
              <span className="text-[11px] font-normal text-slate-500">
                {fdr.renewalHistory?.length || 0} Rollovers Recorded
              </span>
            </h5>

            {fdr.renewalHistory && fdr.renewalHistory.length > 0 ? (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {fdr.renewalHistory.map((rh, idx) => (
                  <div
                    key={rh.id || idx}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-slate-800">
                        Rollover #{rh.renewalCycleNumber || idx + 1}
                      </span>
                      <span className="text-slate-500 ml-2">
                        {rh.previousMaturityDate} &rarr; {rh.newMaturityDate}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-700 font-bold">
                      {formatIndianCurrency(rh.renewedAmount || fdr.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center text-slate-500 text-[11px]">
                Original Deposit in Active Custody (Initial Cycle - 60 Months).
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Direct Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copied ? 'Copied URL!' : 'Copy Verification URL'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCertificate}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Certificate</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
