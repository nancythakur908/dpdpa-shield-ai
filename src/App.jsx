import { useState, useEffect, lazy, Suspense, Component } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Copilot from './components/Copilot';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ConsentManagement from './pages/ConsentManagement';
import RightsRequests from './pages/RightsRequests';
import BreachResponse from './pages/BreachResponse';
import DataInventory from './pages/DataInventory';
import Reports from './pages/Reports';
import AIPrivacyNotice from './pages/AIPrivacyNotice';
import ReadinessAssessment from './pages/ReadinessAssessment';
import ActionPlan from './pages/ActionPlan';
import DataInventoryOperations from './pages/DataInventoryOperations';
import PrivacyRiskRegister from './pages/PrivacyRiskRegister';
import VendorRiskOperations from './pages/VendorRiskOperations';
import RightsRequestManagement from './pages/RightsRequestManagement';
import PublicRightsRequest from './pages/PublicRightsRequest';
import ConsentOperations from './pages/ConsentOperations';
import IncidentResponseOperations from './pages/IncidentResponseOperations';
import PolicyManagementOperations from './pages/PolicyManagementOperations';
import DocumentWorkflow from './pages/DocumentWorkflow';
import ComplianceCalendarOperations from './pages/ComplianceCalendarOperations';
import SupportCenter from './pages/SupportCenter';
import {
  HomePage,
  KnowledgeHubPage,
  PenaltyRiskPage,
  DPOServicePage,
  VDPOServicePage,
  PricingPage,
} from './pages/PlatformPages';
import supabase from './utils/supabaseClient';

const DataDiscoveryPage = lazy(() => import('./pages/EnterpriseModules').then((m) => ({ default: m.DataDiscoveryPage })));
const DataMappingPage = lazy(() => import('./pages/EnterpriseModules').then((m) => ({ default: m.DataMappingPage })));
const CookieConsentPage = lazy(() => import('./pages/EnterpriseModules').then((m) => ({ default: m.CookieConsentPage })));
const AuditLogPage = lazy(() => import('./pages/EnterpriseModules').then((m) => ({ default: m.AuditLogPage })));
const AICopilotPage = lazy(() => import('./pages/EnterpriseModules').then((m) => ({ default: m.AICopilotPage })));
const AdminControlPanel = lazy(() => import('./pages/ProductionPages').then((m) => ({ default: m.AdminControlPanel })));
const AnalyticsPage = lazy(() => import('./pages/ProductionPages').then((m) => ({ default: m.AnalyticsPage })));
function PageLoader() { return <div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-slate-800" /><div className="h-40 rounded-xl bg-slate-900" /><div className="h-56 rounded-xl bg-slate-900" /></div>; }
class ErrorBoundary extends Component { constructor(props) { super(props); this.state = { failed: false }; } static getDerivedStateFromError() { return { failed: true }; } componentDidCatch(error) { console.error('[ui-boundary]', error); } render() { return this.state.failed ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200"><h2 className="font-semibold">This workspace module could not load.</h2><button onClick={() => this.setState({ failed: false })} className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-sm text-white">Try again</button></div> : this.props.children; } }
function EnterprisePage({ children }) { return <ErrorBoundary><Suspense fallback={<PageLoader />}>{children}</Suspense></ErrorBoundary>; }

// ─── Authenticated App Shell ──────────────────────────────────────────────────

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="flex min-h-screen">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuToggle={() => setSidebarCollapsed((v) => !v)} />
          <main className="min-w-0 flex-1 p-4 sm:p-6" id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
      <Copilot open={copilotOpen} onToggle={() => setCopilotOpen((v) => !v)} />
    </div>
  );
}

// ─── Route Guard: requires authenticated Supabase session ─────────────────────

function RequireAuth({ session, loading }) {
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Checking session…</span>
        </div>
      </div>
    );
  }
  return session ? <AppLayout /> : <Navigate to="/login" replace />;
}

// ─── Root App with real Supabase session listener ─────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to auth state changes (sign-in, sign-out, token refresh, expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<Login resetMode />} />
      <Route path="/rights-request" element={<PublicRightsRequest />} />
      <Route path="/rights-request/:organisationId" element={<PublicRightsRequest />} />

      {/* Protected app routes — gated by real Supabase session */}
      <Route element={<RequireAuth session={session} loading={loading} />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/compliance-scanner" element={<ReadinessAssessment />} />
        <Route path="/readiness" element={<Navigate to="/compliance-scanner" replace />} />
        <Route path="/action-plan" element={<ActionPlan />} />
        <Route path="/data-discovery" element={<EnterprisePage><DataDiscoveryPage /></EnterprisePage>} />
        <Route path="/data-inventory" element={<DataInventoryOperations />} />
        <Route path="/data-mapping" element={<EnterprisePage><DataMappingPage /></EnterprisePage>} />
        <Route path="/consent-support" element={<ConsentOperations />} />
        <Route path="/cookie-consent" element={<EnterprisePage><CookieConsentPage /></EnterprisePage>} />
        <Route path="/rights-portal" element={<RightsRequestManagement />} />
        <Route path="/vendor-risk" element={<VendorRiskOperations />} />
        <Route path="/risk-register" element={<PrivacyRiskRegister />} />
        <Route path="/breach-response" element={<IncidentResponseOperations />} />
        <Route path="/policies" element={<PolicyManagementOperations />} />
        <Route path="/document-generator" element={<DocumentWorkflow />} />
        <Route path="/compliance-calendar" element={<ComplianceCalendarOperations />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/analytics" element={<EnterprisePage><AnalyticsPage /></EnterprisePage>} />
        <Route path="/audit-log" element={<EnterprisePage><AuditLogPage /></EnterprisePage>} />
        <Route path="/knowledge-hub" element={<KnowledgeHubPage />} />
        <Route path="/penalty-risk" element={<PenaltyRiskPage />} />
        <Route path="/ai-copilot" element={<EnterprisePage><AICopilotPage /></EnterprisePage>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/support" element={<SupportCenter />} />
        <Route path="/team" element={<EnterprisePage><AdminControlPanel /></EnterprisePage>} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/dpo-services" element={<DPOServicePage />} />
        <Route path="/vdpo-services" element={<VDPOServicePage />} />
        <Route path="/ai-privacy-notice" element={<AIPrivacyNotice />} />

        {/* Legacy redirects */}
        <Route path="/scanner" element={<Navigate to="/compliance-scanner" replace />} />
        <Route path="/documents" element={<Navigate to="/document-generator" replace />} />
        <Route path="/calendar" element={<Navigate to="/compliance-calendar" replace />} />
        <Route path="/consents" element={<Navigate to="/consent-support" replace />} />
        <Route path="/requests" element={<Navigate to="/rights-portal" replace />} />
        <Route path="/breaches" element={<Navigate to="/breach-response" replace />} />
        <Route path="/inventory" element={<Navigate to="/data-inventory" replace />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
