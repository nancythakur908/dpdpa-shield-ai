import { useState, useEffect } from 'react';
import dbStore from '../utils/dbStore';
import brand from '../config/brand';
import supabase from '../utils/supabaseClient';

const tabs = [
  { id: 'organisation', label: 'Organisation Settings' },
  { id: 'governance', label: 'Governance contacts' },
  { id: 'dataProfile', label: 'Data Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
  { id: 'team', label: 'Team Members' },
  { id: 'audit', label: 'Audit Logs' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('organisation');
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Forms
  const [orgForm, setOrgForm] = useState({ name: '', displayName: '', industry: '', businessModel: '', employees: '', monthlyUsers: '', registeredState: '', website: '', businessAddress: '' });
  const [govForm, setGovForm] = useState({ privacyContactName: '', privacyContactEmail: '', grievanceOfficerName: '', grievanceEmail: '', securityContactName: '', securityContactEmail: '', legalReviewer: '', dpoName: '', defaultTaskOwner: '' });
  const [dataProfile, setDataProfile] = useState({});
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Viewer' });
  const [preferences, setPreferences] = useState({ emailReminders: true, deadlineAlerts: true, escalationAlerts: true, timezone: 'Asia/Kolkata' });
  const [security, setSecurity] = useState({ sessionTimeout: '8', mfaRequired: false, loginAlerts: true });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const activeOrgId = sessionStorage.getItem('privsecure_current_org') || '00000000-0000-0000-0000-000000000001';
      const currentOrg = await dbStore.getCurrentOrg(activeOrgId);
      if (currentOrg) {
        setOrg(currentOrg);
        setOrgForm({
          name: currentOrg.name || '',
          displayName: currentOrg.display_name || '',
          industry: currentOrg.industry || '',
          businessModel: currentOrg.business_model || '',
          employees: currentOrg.employees || '',
          monthlyUsers: currentOrg.monthly_users || '',
          registeredState: currentOrg.registered_state || '',
          website: currentOrg.website || '',
          businessAddress: currentOrg.business_address || '',
        });
        
        const settings = currentOrg.organisation_settings?.[0] || {};
        setGovForm({
          privacyContactName: settings.governance?.privacyContactName || '',
          privacyContactEmail: settings.governance?.privacyContactEmail || '',
          grievanceOfficerName: settings.governance?.grievanceOfficerName || '',
          grievanceEmail: settings.governance?.grievanceEmail || '',
          securityContactName: settings.governance?.securityContactName || '',
          securityContactEmail: settings.governance?.securityContactEmail || '',
          legalReviewer: settings.governance?.legalReviewer || '',
          dpoName: settings.governance?.dpoName || '',
          defaultTaskOwner: settings.governance?.defaultTaskOwner || '',
        });
        setDataProfile(settings.data_profile || {});
        setPreferences({ emailReminders: true, deadlineAlerts: true, escalationAlerts: true, timezone: 'Asia/Kolkata', ...(settings.notification_preferences || {}) });
        setSecurity({ sessionTimeout: '8', mfaRequired: false, loginAlerts: true, ...(settings.security_preferences || {}) });
        
        // Members & logs
        const membersData = await dbStore.getOrgMembers(currentOrg.id);
        setTeam(membersData.map(m => ({
          name: m.user_profiles?.full_name || m.user_profiles?.email || 'N/A',
          email: m.user_profiles?.email || 'N/A',
          role: m.role,
          userId: m.user_id
        })));
        
        const logsData = await dbStore.getAuditLogs(currentOrg.id);
        setLogs(logsData);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveOrg(e) {
    e.preventDefault();
    try {
      await dbStore.updateOrg(org.id, {
        name: orgForm.name,
        display_name: orgForm.displayName,
        industry: orgForm.industry,
        business_model: orgForm.businessModel,
        employees: Number(orgForm.employees),
        monthly_users: orgForm.monthlyUsers,
        registered_state: orgForm.registeredState,
        website: orgForm.website,
        business_address: orgForm.businessAddress,
      });
      showToast('Organisation settings saved successfully.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleSaveGovernance(e) {
    e.preventDefault();
    try {
      await dbStore.updateOrgSettings(org.id, {
        governance: govForm,
      });
      showToast('Governance contacts updated.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDataProfileToggle(key) {
    const next = { ...dataProfile, [key]: !dataProfile[key] };
    setDataProfile(next);
    try {
      await dbStore.updateOrgSettings(org.id, {
        data_profile: next,
      });
      showToast('Data profile configuration updated.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function saveWorkspacePreferences(type, value) {
    try {
      await dbStore.updateOrgSettings(org.id, { [type]: value });
      showToast('Settings saved successfully.');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleInvite(e) {
    e.preventDefault();
    try {
      await dbStore.inviteMember(org.id, inviteForm.email, inviteForm.role);
      showToast(`Invited ${inviteForm.email} as ${inviteForm.role}`);
      setInviteForm({ email: '', role: 'Viewer' });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleRemoveMember(userId) {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    try {
      await dbStore.removeMember(org.id, userId);
      showToast('Member removed successfully.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="text-sm text-slate-400">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-2xl transition-all ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-[#060f1e]/80 p-6 backdrop-blur-xl">
        {/* --- Tab 1: Organisation settings --- */}
        {activeTab === 'organisation' && (
          <form onSubmit={handleSaveOrg} className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Company profile details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Legal Company Name</span>
                <input
                  type="text"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Display Name</span>
                <input
                  type="text"
                  value={orgForm.displayName}
                  onChange={(e) => setOrgForm({ ...orgForm, displayName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Industry</span>
                <input
                  type="text"
                  value={orgForm.industry}
                  onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Business Model</span>
                <input
                  type="text"
                  value={orgForm.businessModel}
                  onChange={(e) => setOrgForm({ ...orgForm, businessModel: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Employee count</span>
                <input
                  type="number"
                  value={orgForm.employees}
                  onChange={(e) => setOrgForm({ ...orgForm, employees: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Monthly User Volume</span>
                <input
                  type="text"
                  value={orgForm.monthlyUsers}
                  onChange={(e) => setOrgForm({ ...orgForm, monthlyUsers: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Registered state (State Code)</span>
                <input
                  type="text"
                  value={orgForm.registeredState}
                  onChange={(e) => setOrgForm({ ...orgForm, registeredState: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Website URL</span>
                <input
                  type="url"
                  value={orgForm.website}
                  onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Business Address</span>
              <textarea
                value={orgForm.businessAddress}
                onChange={(e) => setOrgForm({ ...orgForm, businessAddress: e.target.value })}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                rows="3"
              />
            </label>
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
              Save changes
            </button>
          </form>
        )}

        {/* --- Tab 2: Governance contacts --- */}
        {activeTab === 'governance' && (
          <form onSubmit={handleSaveGovernance} className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Privacy & compliance stakeholders</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Privacy Contact Name</span>
                <input
                  type="text"
                  value={govForm.privacyContactName}
                  onChange={(e) => setGovForm({ ...govForm, privacyContactName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Privacy Contact Email</span>
                <input
                  type="email"
                  value={govForm.privacyContactEmail}
                  onChange={(e) => setGovForm({ ...govForm, privacyContactEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Grievance Officer Name</span>
                <input
                  type="text"
                  value={govForm.grievanceOfficerName}
                  onChange={(e) => setGovForm({ ...govForm, grievanceOfficerName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Grievance Officer Email</span>
                <input
                  type="email"
                  value={govForm.grievanceEmail}
                  onChange={(e) => setGovForm({ ...govForm, grievanceEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Security Contact Name</span>
                <input
                  type="text"
                  value={govForm.securityContactName}
                  onChange={(e) => setGovForm({ ...govForm, securityContactName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-400">Security Contact Email</span>
                <input
                  type="email"
                  value={govForm.securityContactEmail}
                  onChange={(e) => setGovForm({ ...govForm, securityContactEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-sm text-white outline-none"
                />
              </label>
            </div>
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
              Save governance profile
            </button>
          </form>
        )}

        {/* --- Tab 3: Data profile --- */}
        {activeTab === 'dataProfile' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Configure processed data profile</h3>
            <p className="text-xs text-slate-400">Select what categories of personal data your business handles. This determines automated assessment scopes and treatment rules.</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {[
                { key: 'customerData', label: 'Customer Personal Data' },
                { key: 'employeeData', label: 'Employee Personal Data' },
                { key: 'childrensData', label: "Children's Data" },
                { key: 'healthData', label: 'Health-related Data' },
                { key: 'financialData', label: 'Financial or Payment Data' },
                { key: 'deviceAnalyticsData', label: 'Device & Analytics Logs' },
                { key: 'thirdPartyProcessors', label: 'Third-party Processors / Vendors' },
                { key: 'crossBorderProcessing', label: 'Cross-border Processing' },
                { key: 'websiteOrMobileApp', label: 'Website / Mobile App' },
                { key: 'aiSystems', label: 'AI Processing Systems' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!dataProfile[item.key]}
                    onChange={() => handleDataProfileToggle(item.key)}
                    className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-slate-200">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <section className="space-y-4"><div><h3 className="text-lg font-bold text-white">Notification preferences</h3><p className="text-sm text-slate-400">Manage workspace reminders and operational alerts.</p></div>{[['emailReminders','Email reminders'],['deadlineAlerts','Deadline alerts'],['escalationAlerts','Escalation alerts']].map(([key,label]) => <label key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"><span className="text-sm text-slate-200">{label}</span><input type="checkbox" checked={preferences[key]} onChange={(e) => { const next = { ...preferences, [key]: e.target.checked }; setPreferences(next); saveWorkspacePreferences('notification_preferences', next); }} /></label>)}</section>
        )}
        {activeTab === 'security' && (
          <section className="space-y-4"><div><h3 className="text-lg font-bold text-white">Security controls</h3><p className="text-sm text-slate-400">Workspace defaults complement Supabase Authentication and server-side RLS.</p></div><label className="block max-w-sm"><span className="mb-1 block text-xs font-semibold text-slate-400">Session timeout (hours)</span><select value={security.sessionTimeout} onChange={(e) => { const next = { ...security, sessionTimeout: e.target.value }; setSecurity(next); saveWorkspacePreferences('security_preferences', next); }} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">{['1','4','8','12','24'].map((v) => <option key={v}>{v}</option>)}</select></label>{[['mfaRequired','Require multi-factor authentication'],['loginAlerts','Send sign-in alerts']].map(([key,label]) => <label key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"><span className="text-sm text-slate-200">{label}</span><input type="checkbox" checked={security[key]} onChange={(e) => { const next = { ...security, [key]: e.target.checked }; setSecurity(next); saveWorkspacePreferences('security_preferences', next); }} /></label>)}<p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">Configure MFA and session lifetime in Supabase Authentication to enforce these controls server-side.</p></section>
        )}

        {/* --- Tab 4: Team members (RBAC & Invitation) --- */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Team invitations & roles</h3>
              <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                <label className="block min-w-[200px] flex-1">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Email Address</span>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none"
                    placeholder="teammate@company.in"
                    required
                  />
                </label>
                <label className="block min-w-[150px]">
                  <span className="mb-1 block text-xs font-semibold text-slate-400">Role</span>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Privacy Admin">Privacy Admin</option>
                    <option value="Organisation Owner">Organisation Owner</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </label>
                <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
                  Invite teammate
                </button>
              </form>
            </div>

            <div className="table-container rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Teammate</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-200">
                  {team.map((member) => (
                    <tr key={member.email} className="hover:bg-slate-900/20">
                      <td className="px-4 py-3 font-semibold text-white">{member.name}</td>
                      <td className="px-4 py-3 text-slate-400">{member.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 text-xs text-blue-300">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Tab 5: Audit logs --- */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Secure tamper-evident operations trail</h3>
            <p className="text-xs text-slate-400">Audit logs fetched directly from Supabase database layer.</p>
            
            <div className="table-container rounded-2xl border border-slate-800 max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor Email</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/20">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{log.actor_email}</td>
                      <td className="px-4 py-3 text-slate-300">{log.action}</td>
                      <td className="px-4 py-3 text-slate-400">{log.entity_type}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.result === 'Failure' || log.result === 'Denied' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {log.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{log.id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 px-4 py-3 text-xs leading-relaxed text-slate-600">
        {brand.disclaimer}
      </div>
    </div>
  );
}
