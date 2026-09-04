import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import brand from '../config/brand';
import dbStore from '../utils/dbStore';
import supabase from '../utils/supabaseClient';

const pageTitles = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/pricing': 'Pricing & Plans',
  '/compliance-scanner': 'Readiness Assessment',
  '/action-plan': 'Action Plan',
  '/knowledge-hub': 'Knowledge Hub',
  '/penalty-risk': 'Penalty Reference',
  '/dpo-services': 'DPO Services',
  '/vdpo-services': 'VDPO Services',
  '/consent-support': 'Consent Management',
  '/breach-response': 'Incident Response',
  '/rights-portal': 'Rights Requests',
  '/document-generator': 'Document Generator',
  '/vendor-risk': 'Vendor Risk',
  '/data-inventory': 'Data Inventory',
  '/data-discovery': 'Data Discovery',
  '/data-mapping': 'Data Mapping',
  '/cookie-consent': 'Cookie Consent',
  '/risk-register': 'Risk Register',
  '/policies': 'Policy Management',
  '/compliance-calendar': 'Compliance Calendar',
  '/reports': 'Reports',
  '/audit-log': 'Audit Log',
  '/ai-copilot': 'AI Copilot',
  '/team': 'Team',
  '/settings': 'Settings',
  '/ai-privacy-notice': 'AI Privacy Notice',
};

const notifications = [
  { id: 1, text: 'REQ-007 erasure request is overdue by 2 days', type: 'urgent', read: false },
  { id: 2, text: 'CleverTap DPA is missing — high risk vendor', type: 'warning', read: false },
  { id: 3, text: 'INC-002 investigation requires your attention', type: 'info', read: false },
  { id: 4, text: 'Monthly readiness report is ready to review', type: 'info', read: true },
];

export default function Header({ onMenuToggle }) {
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageTitle = pageTitles[location.pathname] || 'Workspace';
  
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    async function loadHeaderState() {
      try {
        const user = await dbStore.getCurrentUser();
        setCurrentUser(user);

        const activeOrgId = sessionStorage.getItem('privsecure_current_org') || '00000000-0000-0000-0000-000000000001';
        const orgData = await dbStore.getCurrentOrg(activeOrgId);
        setCurrentOrg(orgData);
      } catch (err) {
        console.error('[Header] failed to load states:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadHeaderState();
  }, []);

  const handleLogout = async () => {
    try {
      await dbStore.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#060f1e]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: hamburger + breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            id="mobile-menu-btn"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Open navigation menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-sm">
              <li>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400/80">
                  {brand.shortName}
                </span>
              </li>
              <li aria-hidden="true" className="text-slate-600">/</li>
              <li>
                <h1 className="truncate font-semibold text-white">{pageTitle}</h1>
              </li>
            </ol>
          </nav>
        </div>

        {/* Right: search + notifications + user */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Search */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 sm:flex">
            <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              id="global-search"
              type="search"
              placeholder="Search platform..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-40 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:w-52 transition-all duration-200"
              aria-label="Search platform"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              id="notifications-btn"
              onClick={() => { setNotifOpen((o) => !o); setUserMenuOpen(false); }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              aria-label={`Notifications (${unreadCount} unread)`}
              aria-expanded={notifOpen}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-800 bg-[#0a1628]/98 p-3 shadow-2xl backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-white">Notifications</p>
                  <button className="text-xs text-blue-400 hover:text-blue-300">Mark all read</button>
                </div>
                <div className="space-y-1.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl px-3 py-2.5 text-sm transition ${
                        n.read
                          ? 'text-slate-500'
                          : n.type === 'urgent'
                          ? 'border border-rose-500/20 bg-rose-500/8 text-rose-200'
                          : n.type === 'warning'
                          ? 'border border-amber-500/20 bg-amber-500/8 text-amber-200'
                          : 'border border-slate-800 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            n.type === 'urgent' ? 'bg-rose-400' : n.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                          }`} />
                        )}
                        <p className="leading-snug">{n.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => { setUserMenuOpen((o) => !o); setNotifOpen(false); }}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-2.5 py-2 transition hover:border-slate-700 hover:bg-slate-800"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-emerald-400 text-xs font-bold text-white">
                {currentUser?.profile?.avatar_initials || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden text-sm font-medium text-slate-200 sm:block">
                {currentUser?.profile?.full_name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'User'}
              </span>
              <svg className="hidden h-3 w-3 text-slate-500 sm:block" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 11L3 6h10l-5 5z" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-slate-800 bg-[#0a1628]/98 p-2 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-slate-800 px-3 pb-2 mb-1">
                  <p className="text-sm font-semibold text-white">{currentUser?.profile?.full_name || 'Active User'}</p>
                  <p className="text-xs text-slate-400">{currentUser?.email}</p>
                </div>
                <div className="space-y-0.5">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>◌</span> Settings
                  </Link>
                  <div className="border-t border-slate-800 pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <span>↪</span> Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date (desktop) */}
          <div className="hidden items-center rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 xl:flex">
            <p className="text-xs text-slate-400">{today}</p>
          </div>
        </div>
      </div>

      {/* Demo org bar */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="font-medium text-amber-400">Workspace Context</span>
        </span>
        <span>•</span>
        <span className="font-medium text-slate-400">{currentOrg?.name || 'Loading organization...'}</span>
        <span>•</span>
        <span>{currentOrg?.industry || 'General'}</span>
        <span>•</span>
        <span>{currentOrg?.employees || 0} employees</span>
        <span>•</span>
        <span className="text-slate-600">
          PrivSecure India provides technology-assisted readiness support — not legal advice
        </span>
      </div>
    </header>
  );
}
