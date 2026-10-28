import React, { useState } from 'react';
import { SystemSettings } from '../../types';
import { getSystemSettings, saveSystemSettings, resetToSeedData, runMaturityAndLifecycleScheduler } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Settings,
  Save,
  RefreshCw,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Server,
} from 'lucide-react';

interface AdminSettingsProps {
  onRefreshData: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onRefreshData }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(() => getSystemSettings());
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(settings, currentUser);
    setIsSaved(true);
    showToast('Settings Saved', 'Regulatory bureau settings and policies updated.', 'success');
    setTimeout(() => setIsSaved(false), 3000);
    onRefreshData();
  };

  const handleResetData = () => {
    resetToSeedData(currentUser);
    setSettings(getSystemSettings());
    showToast('Database Restored', 'System successfully reset to baseline seed state.', 'info');
    onRefreshData();
  };

  const handleTriggerScheduler = () => {
    const res = runMaturityAndLifecycleScheduler(currentUser);
    showToast(
      'Maturity Engine Executed',
      `Checked: ${res.checkedCount} • Expiring: ${res.expiringCount} • Matured: ${res.maturedCount} • Overdue: ${res.overdueCount}`,
      'success'
    );
    onRefreshData();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-700" />
            <span>AICTE Regulatory Bureau System Settings &amp; Policies</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure statutory maturity reminder windows, CBS bank verification modes, and upload thresholds
          </p>
        </div>

        {isSaved && (
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved &amp; Audit Logged</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Policy Section 1: Reminder Thresholds */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-900">Maturity Monitoring &amp; Escalation Intervals</h3>
            <p className="text-xs text-slate-500">
              Configure automated notification intervals prior to and post maturity date
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Notice 1: Initial Expiry Notice (Days Before)
              </label>
              <input
                type="number"
                value={settings.reminderPeriod1Days}
                onChange={(e) => setSettings({ ...settings, reminderPeriod1Days: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Standard: 60 Days prior</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Notice 2: Urgent Expiry Notice (Days Before)
              </label>
              <input
                type="number"
                value={settings.reminderPeriod2Days}
                onChange={(e) => setSettings({ ...settings, reminderPeriod2Days: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Standard: 30 Days prior</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Notice 3: Final Reminder Notice (Days Before)
              </label>
              <input
                type="number"
                value={settings.reminderPeriod3Days}
                onChange={(e) => setSettings({ ...settings, reminderPeriod3Days: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Standard: 15 Days prior</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Overdue Escalation Grace Period (Days After Maturity)
              </label>
              <input
                type="number"
                value={settings.overdueEscalationDays}
                onChange={(e) => setSettings({ ...settings, overdueEscalationDays: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-rose-700"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Escalates to Regional Bureau Head</span>
            </div>
          </div>
        </div>

        {/* Policy Section 2: Mock Bank Verification CBS Mode */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Prototype Core Banking (CBS) Gateway Mode</h3>
              <p className="text-xs text-slate-500">
                Simulate different Core Banking responses during SIH demonstration
              </p>
            </div>
            <Server className="w-5 h-5 text-blue-600" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'NORMAL',
                  title: 'Normal Operation (100% Match)',
                  desc: 'CBS Gateway cross-checks and approves valid deposits seamlessly.',
                },
                {
                  id: 'SIMULATE_MISMATCH',
                  title: 'Simulate Amount Mismatch',
                  desc: 'Gateway responds with discrepancy (₹5 Lakh lower) to test discrepancy resolution.',
                },
                {
                  id: 'SIMULATE_UNAVAILABLE',
                  title: 'Simulate SFMS Timeout',
                  desc: 'Tests offline fallback and graceful error messaging.',
                },
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setSettings({ ...settings, bankApiMockMode: mode.id as any })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    settings.bankApiMockMode === mode.id
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-300'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-bold text-xs text-slate-900">{mode.title}</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">{mode.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Policy Section 3: File Management */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-900">Cryptographic Document Management Rules</h3>
            <p className="text-xs text-slate-500">Restricted extensions and memory allocation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Max Upload File Size (MB)</label>
              <input
                type="number"
                value={settings.maxFileSizeMb}
                onChange={(e) => setSettings({ ...settings, maxFileSizeMb: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Allowed File Formats</label>
              <input
                type="text"
                disabled
                value="PDF, JPG, JPEG, PNG (MIME Verified)"
                className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerScheduler}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Automated Scheduler Now</span>
            </button>

            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Seed Data</span>
            </button>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-700 text-white hover:bg-blue-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
