import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Shield, CreditCard, RefreshCw, 
  CheckCircle, Database, FileText, AlertTriangle 
} from 'lucide-react';
import { db } from '../services/db';
import { ACADEMY_UPI_ID } from '../server/config';
import { useAuth } from '../context/AuthContext';
import { SrikaraLogo } from '../components/SrikaraLogo';

export const SettingsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [settings, setSettings] = useState(db.getSettings());
  const auditLogs = db.getAuditLogs();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.updateSettings(settings, currentUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Academy Profile Settings */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="border-b pb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Srikara Academy Profile & Tax Settings
            </h3>
            <p className="text-xs text-slate-500">
              Institute branding, invoicing details, and official contact information
            </p>
          </div>
          <SrikaraLogo variant="horizontal" size="sm" />
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Academy Name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.academyName}
                onChange={(e) => setSettings({ ...settings, academyName: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                disabled={!isAdmin}
                value={settings.academyEmail}
                onChange={(e) => setSettings({ ...settings, academyEmail: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.academyPhone}
                onChange={(e) => setSettings({ ...settings, academyPhone: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2 flex justify-between items-center">
              {saveSuccess ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Settings updated successfully
                </span>
              ) : <div />}
              <button
                type="submit"
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                Save Academy Profile
              </button>
            </div>
          )}
        </form>
      </div>

      {/* UPI payment collection */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="border-b pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-700" />
              Fee Collection (UPI)
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
            Live
          </span>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium">Academy UPI ID:</span>
            <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border">{ACADEMY_UPI_ID}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium">Verification:</span>
            <span className="font-semibold text-emerald-700">Payment screenshot required</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-2 border-t">
            Students pay to the UPI ID above, upload the payment screenshot and press Verify. Without a
            screenshot nothing is submitted. Admin can open the screenshot from the Receipt window.
          </p>
        </div>
      </div>

      {/* MongoDB Atlas Database Integration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="border-b pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              MongoDB Atlas Database Architecture & Schemas
            </h3>
            <p className="text-xs text-slate-500">
              Cloud document database configuration, Mongoose schemas, and cluster connectivity
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
            Mongoose Models Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>MongoDB Atlas Collections & Schemas</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">users</span>
                <span className="text-slate-400 block text-[10px]">Auth & Roles</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">students</span>
                <span className="text-slate-400 block text-[10px]">Roster & Demographics</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">installments</span>
                <span className="text-slate-400 block text-[10px]">3-Month Isolated Dues</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">payments</span>
                <span className="text-slate-400 block text-[10px]">Transactions & Receipts</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">trainers</span>
                <span className="text-slate-400 block text-[10px]">Faculty & Skills</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">courses</span>
                <span className="text-slate-400 block text-[10px]">Curriculum & Prices</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">leaves</span>
                <span className="text-slate-400 block text-[10px]">Student Absence</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-mono font-bold text-slate-800">schedules</span>
                <span className="text-slate-400 block text-[10px]">Classes & Meets</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900">How to Connect Your MongoDB Atlas Cluster</h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
              <li>Log in to <strong className="text-slate-800">MongoDB Atlas</strong> (cloud.mongodb.com).</li>
              <li>Under Clusters, click <strong className="text-slate-800">Connect</strong> &rarr; <strong className="text-slate-800">Drivers (Node.js)</strong>.</li>
              <li>Copy your connection URI and set in <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">.env</code>:</li>
            </ol>
            <div className="bg-slate-900 text-slate-200 p-2.5 rounded font-mono text-[10px] break-all border border-slate-800">
              MONGODB_URI="mongodb+srv://&lt;user&gt;:&lt;password&gt;@cluster0.xxxxx.mongodb.net/srikara_crm"
            </div>
            <p className="text-[10px] text-slate-500">
              When configured, the backend automatically connects and creates empty collections plus one Admin login. No sample data is inserted.
            </p>
          </div>
        </div>
      </div>

      {/* Section 35: Audit Log Roster */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Section 35: System & Financial Audit Logs ({auditLogs.length})</span>
          <span className="text-slate-500 font-normal">Immutable admin ledger</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3.5 text-xs hover:bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    {log.action}
                  </span>
                  <span className="font-bold text-slate-900">{log.user_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">[{log.user_role}]</span>
                </div>
                <p className="text-slate-700 mt-1">
                  {log.new_value || log.action}
                </p>
                {log.old_value && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Previous state: {log.old_value}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
