import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import brand from '../config/brand';

// ─── Navigation Structure ─────────────────────────────────────────────────────

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: '⊞', id: 'nav-dashboard' },
      { label: 'Readiness Assessment', path: '/compliance-scanner', icon: '◎', id: 'nav-readiness' },
      { label: 'Action Plan', path: '/action-plan', icon: '✓', id: 'nav-action-plan' },
    ],
  },
  {
    label: 'Data Governance',
    items: [
      { label: 'Data Discovery', path: '/data-discovery', icon: '⬡', id: 'nav-data-discovery' },
      { label: 'Data Inventory', path: '/data-inventory', icon: '◫', id: 'nav-data-inventory' },
      { label: 'Data Mapping', path: '/data-mapping', icon: '⇄', id: 'nav-data-mapping' },
      { label: 'Consent', path: '/consent-support', icon: '☑', id: 'nav-consent' },
      { label: 'Cookie Consent', path: '/cookie-consent', icon: '🍪', id: 'nav-cookie' },
    ],
  },
  {
    label: 'Privacy Operations',
    items: [
      { label: 'Rights Requests', path: '/rights-portal', icon: '⇌', id: 'nav-rights' },
      { label: 'Vendor Risk', path: '/vendor-risk', icon: '⬡', id: 'nav-vendor' },
      { label: 'Risk Register', path: '/risk-register', icon: '⚡', id: 'nav-risk' },
      { label: 'Incident Response', path: '/breach-response', icon: '⚠', id: 'nav-incident' },
      { label: 'Policies', path: '/policies', icon: '📄', id: 'nav-policies' },
      { label: 'Documents', path: '/document-generator', icon: '⊡', id: 'nav-docs' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Calendar', path: '/compliance-calendar', icon: '📅', id: 'nav-calendar' },
      { label: 'Reports', path: '/reports', icon: '◩', id: 'nav-reports' },
      { label: 'Analytics', path: '/analytics', icon: '▥', id: 'nav-analytics' },
      { label: 'Audit Log', path: '/audit-log', icon: '≡', id: 'nav-audit' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Knowledge Hub', path: '/knowledge-hub', icon: '◎', id: 'nav-knowledge' },
      { label: 'Legal Updates', path: '/penalty-risk', icon: '⚖', id: 'nav-legal' },
      { label: 'AI Copilot', path: '/ai-copilot', icon: '✦', id: 'nav-copilot' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Team', path: '/team', icon: '◑', id: 'nav-team' },
      { label: 'Settings', path: '/settings', icon: '◌', id: 'nav-settings' },
      { label: 'Billing', path: '/pricing', icon: '◇', id: 'nav-billing' },
      { label: 'Support', path: '/support', icon: '?', id: 'nav-support' },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  function toggleGroup(label) {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800/80
          bg-[#060f1e]/98 backdrop-blur-xl transition-all duration-300 ease-in-out
          lg:static lg:z-auto
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-[72px]' : 'translate-x-0 w-72'}
        `}
        aria-label="Primary navigation"
      >
        {/* Brand header */}
        <div className={`flex items-center gap-3 border-b border-slate-800/60 px-4 py-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          {/* Wordmark logo */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-400 shadow-lg shadow-blue-500/25">
            <span className="text-sm font-black text-white">PS</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white">
                {brand.name}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                Privacy & DPDP Operations
              </p>
            </div>
          )}
          <button
            onClick={onToggle}
            id="sidebar-toggle"
            className={`ml-auto hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:flex ${collapsed ? 'mx-auto ml-0' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              {collapsed ? (
                <path d="M3 8a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9A.5.5 0 013 8zm3.146-3.354a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L8.793 8 6.146 5.354a.5.5 0 010-.708z" />
              ) : (
                <path d="M13 8a.5.5 0 01-.5.5h-9a.5.5 0 010-1h9A.5.5 0 0113 8zM9.854 4.646a.5.5 0 010 .708L7.207 8l2.647 2.646a.5.5 0 01-.708.708l-3-3a.5.5 0 010-.708l3-3a.5.5 0 01.708 0z" />
              )}
            </svg>
          </button>
        </div>

        {/* Demo badge */}
        {!collapsed && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-xs font-medium text-amber-300">Demo Workspace</p>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin" aria-label="Main navigation">
          {navGroups.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.label];
            return (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 text-left"
                    aria-expanded={!isGroupCollapsed}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {group.label}
                    </span>
                    <svg
                      className={`h-3 w-3 text-slate-600 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                )}

                {(!isGroupCollapsed || collapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        id={item.id}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                            isActive
                              ? 'bg-blue-600/15 text-blue-300 shadow-sm shadow-blue-500/10'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                          } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`
                        }
                      >
                        <span className="shrink-0 text-base leading-none opacity-70 group-hover:opacity-100">
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="truncate leading-tight">{item.label}</span>
                        )}
                        {!collapsed && location.pathname === item.path && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}

                {!collapsed && <div className="mt-2 border-b border-slate-800/40" />}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-slate-800/60 p-3">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/6 p-3">
              <p className="text-xs font-semibold text-emerald-300">Privacy Readiness Mode</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-400/70">
                Technology-assisted readiness support. Not legal advice.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
