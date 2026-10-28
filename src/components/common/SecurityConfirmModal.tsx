/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Step-Up Multi-Factor Authorization Modal (SIH 2026 Problem Statement ID: 26265)
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, KeyRound, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../services/auditService';

interface SecurityConfirmModalProps {
  isOpen: boolean;
  title: string;
  actionName: string;
  targetEntityId: string;
  description: string;
  severity?: 'WARNING' | 'CRITICAL';
  onSuccess: () => void;
  onCancel: () => void;
}

export const SecurityConfirmModal: React.FC<SecurityConfirmModalProps> = ({
  isOpen,
  title,
  actionName,
  targetEntityId,
  description,
  severity = 'WARNING',
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  // Designated standard authorization PIN for simulation
  const VALID_PINS = ['AICTE2026', '123456', '998877'];

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    setTimeout(() => {
      const cleanPin = pin.trim().toUpperCase();
      if (VALID_PINS.includes(cleanPin) || cleanPin === '2026') {
        // Log step-up auth success
        logAuditEvent({
          user: currentUser,
          action: 'STEP_UP_AUTH_SUCCESS',
          entity: 'SECURITY',
          entityId: targetEntityId,
          description: `Dual-factor step-up authentication cleared by ${currentUser.name} for action: ${actionName}`,
        });

        setIsVerifying(false);
        setPin('');
        onSuccess();
      } else {
        // Log step-up auth failure
        logAuditEvent({
          user: currentUser,
          action: 'STEP_UP_AUTH_FAILED',
          entity: 'SECURITY',
          entityId: targetEntityId,
          description: `Invalid security pin entered during step-up authorization for action: ${actionName}`,
        });

        setIsVerifying(false);
        setError('Invalid Security PIN or OTP. Try demo code "AICTE2026" or "123456".');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-5 flex items-start justify-between border-b ${
          severity === 'CRITICAL' ? 'bg-rose-50/70 border-rose-100' : 'bg-amber-50/70 border-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Dual-Factor Step-Up Authorization</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>High-Privilege Financial Operation</span>
            </p>
            {description}
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Enter Security PIN or OTP Token
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Demo PIN: AICTE2026"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono tracking-widest focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                  autoFocus
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Authorized regulatory key: <span className="font-mono font-bold text-blue-600">AICTE2026</span>
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !pin.trim()}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                  severity === 'CRITICAL'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-700 hover:bg-blue-800'
                } disabled:opacity-50`}
              >
                {isVerifying ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize Execution</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
