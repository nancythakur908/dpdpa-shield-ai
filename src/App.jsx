import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ConsentManagement from './pages/ConsentManagement';
import RightsRequests from './pages/RightsRequests';
import BreachResponse from './pages/BreachResponse';
import DataInventory from './pages/DataInventory';
import Reports from './pages/Reports';
import AIPrivacyNotice from './pages/AIPrivacyNotice';
import Settings from './pages/Settings';
import {
  HomePage,
  KnowledgeHubPage,
  ComplianceScannerPage,
  PenaltyRiskPage,
  DPOServicePage,
  VDPOServicePage,
  ConsentSupportPage,
  BreachCenterPage,
  RightsPortalPage,
  DocumentGeneratorPage,
  VendorRiskPage,
  DataInventoryPage,
  ComplianceCalendarPage,
  SettingsPage,
  PricingPage,
} from './pages/PlatformPages';

function AppLayout() {
  const location = useLocation();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const titleMap = {
    '/': 'Homepage',
    '/dashboard': 'Business Dashboard',
    '/pricing': 'Pricing & Packages',
    '/compliance-scanner': 'Compliance Scanner',
    '/knowledge-hub': 'Knowledge Hub',
    '/penalty-risk': 'Penalty & Fine Risk',
    '/dpo-services': 'DPO Services',
    '/vdpo-services': 'VDPO Services',
    '/consent-support': 'Consent Support',
    '/breach-response': 'Breach Response',
    '/rights-portal': 'Rights Portal',
    '/document-generator': 'Document Generator',
    '/vendor-risk': 'Vendor Risk',
    '/data-inventory': 'Data Inventory',
    '/compliance-calendar': 'Compliance Calendar',
    '/settings': 'Settings',
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1">
          <Header title={titleMap[location.pathname] || 'Workspace'} />
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">{titleMap[location.pathname] || 'Workspace'}</span> • AI-powered DPDP compliance assistance for Arya Retail Pvt Ltd
            </div>
            <Outlet />
          </main>
        </div>
      </div>

      <button
        onClick={() => setCopilotOpen((open) => !open)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-2xl"
      >
        {copilotOpen ? 'Close Copilot' : 'DPDP AI Copilot'}
      </button>

      {copilotOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[min(92vw,24rem)] rounded-3xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">DPDP AI Copilot</p>
              <p className="text-xs text-slate-400">General guidance only • not legal advice</p>
            </div>
            <button onClick={() => setCopilotOpen(false)} className="text-sm text-slate-400">✕</button>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <p className="font-semibold text-white">What documents do I need?</p>
              <p className="mt-1">Start with a privacy notice, consent notices, vendor review checklist, and breach response policy.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <p className="font-semibold text-white">How do I improve my score?</p>
              <p className="mt-1">Close gaps around consent logs, vendor assessments, and retention controls first.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <p className="font-semibold text-white">Do I need a DPO?</p>
              <p className="mt-1">Use the DPO services page to assess your business profile and risk posture.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
      <Route element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/compliance-scanner" element={<ComplianceScannerPage />} />
        <Route path="/scanner" element={<Navigate to="/compliance-scanner" replace />} />
        <Route path="/knowledge-hub" element={<KnowledgeHubPage />} />
        <Route path="/penalty-risk" element={<PenaltyRiskPage />} />
        <Route path="/dpo-services" element={<DPOServicePage />} />
        <Route path="/vdpo-services" element={<VDPOServicePage />} />
        <Route path="/consent-support" element={<ConsentSupportPage />} />
        <Route path="/breach-response" element={<BreachCenterPage />} />
        <Route path="/rights-portal" element={<RightsPortalPage />} />
        <Route path="/document-generator" element={<DocumentGeneratorPage />} />
        <Route path="/documents" element={<Navigate to="/document-generator" replace />} />
        <Route path="/vendor-risk" element={<VendorRiskPage />} />
        <Route path="/data-inventory" element={<DataInventoryPage />} />
        <Route path="/compliance-calendar" element={<ComplianceCalendarPage />} />
        <Route path="/calendar" element={<Navigate to="/compliance-calendar" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/ai-privacy-notice" element={<AIPrivacyNotice />} />
        <Route path="/consents" element={<ConsentManagement />} />
        <Route path="/requests" element={<RightsRequests />} />
        <Route path="/breaches" element={<BreachResponse />} />
        <Route path="/inventory" element={<DataInventory />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
