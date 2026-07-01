import { NavLink } from 'react-router-dom';

const navigation = [
  { label: 'Homepage', path: '/' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Compliance Scanner', path: '/compliance-scanner' },
  { label: 'DPDPA Knowledge Hub', path: '/knowledge-hub' },
  { label: 'Penalty Risk', path: '/penalty-risk' },
  { label: 'DPO Services', path: '/dpo-services' },
  { label: 'VDPO Services', path: '/vdpo-services' },
  { label: 'Consent Support', path: '/consent-support' },
  { label: 'Breach Response', path: '/breach-response' },
  { label: 'Rights Portal', path: '/rights-portal' },
  { label: 'Documents', path: '/document-generator' },
  { label: 'Vendor Risk', path: '/vendor-risk' },
  { label: 'Data Inventory', path: '/data-inventory' },
  { label: 'Compliance Calendar', path: '/compliance-calendar' },
  { label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950/95 lg:w-72 lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:h-screen">
      <div className="border-b border-slate-800 p-5">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-white">DPDPA Shield AI</p>
            <p className="text-xs text-slate-400">Indian compliance platform</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 p-4 lg:flex-col lg:gap-1">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-500/15 text-blue-300 shadow-soft'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="m-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        <p className="font-semibold">Readiness mode</p>
        <p className="mt-1 text-xs text-emerald-200/90">Support tool for privacy readiness, templates, and governance workflows.</p>
      </div>
    </aside>
  );
}
