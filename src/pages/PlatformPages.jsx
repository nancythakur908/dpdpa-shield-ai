import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import { companyProfile, consents, rightsRequests } from '../data/sampleData';

const documentTemplates = [
  { title: 'Privacy Notice', status: 'Reviewed', lastGenerated: '12 Jun 2026' },
  { title: 'Consent Notice', status: 'Draft', lastGenerated: '08 Jun 2026' },
  { title: 'Vendor Assessment Checklist', status: 'Draft', lastGenerated: '03 Jun 2026' },
  { title: 'Breach Response Policy', status: 'Approved', lastGenerated: '28 May 2026' },
];

const knowledgeCards = [
  { title: 'What is DPDPA?', body: 'The Digital Personal Data Protection Act, 2023 governs the processing of digital personal data in India and lays out core obligations for businesses.', type: 'Overview' },
  { title: 'DPDPA Timeline', body: 'The law was enacted in 2023, rules were notified in 2025, and key operational milestones are expected over the next few years.', type: 'Timeline' },
  { title: 'Business Obligations', body: 'Businesses should provide clear notices, obtain valid consent where required, secure data, and support user rights.', type: 'Obligations' },
  { title: 'Children Data Rules', body: 'Special care is needed when processing children’s data, including consent and restricted behavioural practices.', type: 'Children' },
];

const glossaryItems = [
  { term: 'DPDPA', explanation: 'The Digital Personal Data Protection Act, 2023 is India’s main privacy law for digital personal data. It defines how businesses collect, use, store, and protect personal data.' },
  { term: 'DPO', explanation: 'A Data Protection Officer is a privacy leader who helps oversee data governance, policies, compliance workflows, and privacy operations within an organisation.' },
  { term: 'VDPO', explanation: 'A Virtual Data Protection Officer provides outsourced privacy support, often for businesses that need help without hiring a full-time internal DPO.' },
  { term: 'Data Fiduciary', explanation: 'The entity that decides the purpose and means of processing personal data, such as a company operating a website, app, or service.' },
  { term: 'Data Principal', explanation: 'The person whose personal data is being processed. In simple terms, this is the customer, employee, or user whose data is collected.' },
  { term: 'Data Processor', explanation: 'A third party that processes personal data on behalf of a data fiduciary, such as a cloud provider, payment service, or analytics vendor.' },
  { term: 'Consent Manager', explanation: 'A service that helps manage and record consent preferences. It is part of the wider consent and notice framework for privacy operations.' },
  { term: 'Significant Data Fiduciary', explanation: 'A larger or higher-risk data fiduciary that may face extra obligations and stronger governance expectations under the law.' },
  { term: 'Breach', explanation: 'A personal data breach is any incident where personal data may be accessed, leaked, lost, or exposed in an unauthorised manner.' },
  { term: 'Privacy Notice', explanation: 'A clear notice that tells users what data is collected, why it is collected, how it is used, and how they can exercise their rights.' },
  { term: 'Rights Requests', explanation: 'These are requests from users to access, correct, delete, or withdraw consent for their data, or to raise a grievance.' },
  { term: 'DPIA', explanation: 'A Data Protection Impact Assessment is a review used to identify and reduce risks for higher-risk data processing activities.' },
];

const dpoVsVdpo = [
  {
    role: 'DPO',
    summary: 'A Data Protection Officer is an internal privacy leader who oversees governance, policies, and compliance operations.',
    bestFor: 'Businesses that want deeper in-house privacy ownership and structured oversight.',
  },
  {
    role: 'VDPO',
    summary: 'A Virtual Data Protection Officer provides outsourced support for privacy operations, documentation, and readiness without a full-time hire.',
    bestFor: 'Growing companies that need practical support and faster access to expertise.',
  },
];

const scannerQuestions = [
  'Do you collect name, phone, email, address or Aadhaar?',
  'Do you collect payment or financial data?',
  'Do you collect children’s data?',
  'Do you use third-party vendors or processors?',
  'Do you have a clear privacy notice?',
  'Do you provide consent notice before data collection?',
  'Do you maintain consent logs?',
  'Do users have a way to withdraw consent?',
  'Do users have a way to request correction or erasure?',
  'Do you have a breach response process?',
  'Do you delete or anonymize data when purpose is complete?',
  'Do you maintain vendor agreements?',
  'Do you collect data through website/app forms?',
  'Do you transfer data outside India?',
  'Do you use AI tools to process customer data?',
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '₹7,999/mo',
    description: 'For early-stage teams building their first DPDP workflow.',
    highlights: ['Privacy notice and consent templates', 'Basic compliance scanner', 'Rights request tracking', 'Email support'],
    featured: false,
  },
  {
    name: 'Growth',
    price: '₹19,999/mo',
    description: 'For scaling businesses that need stronger governance and operations.',
    highlights: ['Everything in Starter', 'Vendor risk workflow', 'Breach response templates', 'DPO/VDPO advisory sessions'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For larger teams needing tailored workflows, reviews, and reporting.',
    highlights: ['Custom document library', 'Advanced data mapping', 'Board-ready reporting', 'Priority implementation support'],
    featured: false,
  },
];

const penaltyRows = [
  {
    category: 'Failure to maintain reasonable security safeguards',
    penalty: 'Up to ₹250 crore',
    scenario: 'The business does not protect personal data with reasonable security controls.',
    example: 'Customer data is exposed because the app stored personal data without encryption or access restrictions.',
    control: 'Security safeguards, access control, encryption, audit logs, breach monitoring, security review.',
    risk: 'High',
  },
  {
    category: 'Failure to notify personal data breach',
    penalty: 'Up to ₹200 crore',
    scenario: 'The business fails to notify the Data Protection Board or affected Data Principals as required after a personal data breach.',
    example: 'A company discovers that customer phone numbers and emails were leaked but does not notify users or authorities properly.',
    control: 'Breach response workflow, notification templates, incident register, 72-hour response tracker.',
    risk: 'High',
  },
  {
    category: 'Violation of children’s data obligations',
    penalty: 'Up to ₹200 crore',
    scenario: 'The business processes children’s personal data without required safeguards or parental consent where applicable.',
    example: 'An EdTech app collects data from children below 18 without proper parental consent or uses tracking/targeted advertising.',
    control: 'Age gate, verifiable parental consent, children data policy, restricted profiling/tracking.',
    risk: 'High',
  },
  {
    category: 'Significant Data Fiduciary obligation violation',
    penalty: 'Up to ₹150 crore',
    scenario: 'A notified Significant Data Fiduciary fails to meet additional obligations.',
    example: 'A high-scale platform is required to appoint a DPO, conduct audits or DPIA, but fails to do so.',
    control: 'DPO appointment, DPIA, audit process, governance reporting, risk review.',
    risk: 'High',
  },
  {
    category: 'Other Data Fiduciary obligation violations',
    penalty: 'Up to ₹50 crore',
    scenario: 'The business fails to meet general DPDP duties such as notice, consent, grievance process, retention, or user rights handling.',
    example: 'A business collects customer data but has no privacy notice, no consent logs, and no deletion process.',
    control: 'Privacy notice, consent notice, consent logs, grievance workflow, retention policy.',
    risk: 'Medium/High',
  },
  {
    category: 'Data Principal duty breach',
    penalty: 'Up to ₹10,000',
    scenario: 'A Data Principal submits false information or a false/frivolous grievance.',
    example: 'A person submits a false or frivolous grievance.',
    control: 'Request verification, grievance screening, audit trail.',
    risk: 'Low',
  },
];

function SectionCard({ title, children }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-soft sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">AI-powered DPDP compliance assistant</p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">DPDPA Shield AI</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">A premium compliance assistance platform for Indian businesses preparing for the Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/compliance-scanner" className="rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white">Start Free Compliance Scan</Link>
              <Link to="/dpo-services" className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Explore DPO Services</Link>
              <Link to="/document-generator?doc=privacy-notice" className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Generate Privacy Notice</Link>
            </div>
            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 sm:grid-cols-2">
              <div>• Built for Indian DPDP readiness</div>
              <div>• AI-assisted compliance workflow</div>
              <div>• Privacy notice and consent templates</div>
              <div>• Breach response support</div>
            </div>
            <p className="mt-4 text-sm text-slate-500">This platform provides general compliance assistance and template-based guidance. It is not legal advice.</p>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Readiness overview</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300"><span>Overall compliance score</span><span className="text-white">64%</span></div>
                <ProgressBar value={64} label="Readiness" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Missing documents</p><p className="mt-2 text-2xl font-semibold text-white">5</p></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Pending user requests</p><p className="mt-2 text-2xl font-semibold text-white">7</p></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Vendor risk</p><p className="mt-2 text-2xl font-semibold text-white">Medium</p></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4"><p className="text-sm text-slate-400">Breach readiness</p><p className="mt-2 text-2xl font-semibold text-white">48%</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Overall Compliance Score', '64%'],
          ['Missing Documents', '5'],
          ['Pending Requests', '7'],
          ['Vendor Risk', 'Medium'],
          ['Breach Readiness', '48%'],
          ['Consent Coverage', '71%'],
        ].map(([title, value]) => (
          <div key={title} className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{title}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">DPDP timeline</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Milestones for business planning</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">Dates are shown for product guidance and compliance planning. Businesses should verify final applicability based on official notifications and legal advice.</p>
          </div>
          <Link to="/knowledge-hub" className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Explore Knowledge Hub</Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['11 August 2023', 'Digital Personal Data Protection Act, 2023 enacted.'],
            ['14 November 2025', 'DPDP Rules, 2025 notified.'],
            ['November 2026', 'Consent Manager-related framework/provisions become operational.'],
            ['May 2027', 'Major/core compliance obligations become applicable for covered businesses.'],
          ].map(([date, detail]) => (
            <div key={date} className="rounded-[1.4rem] border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-sm font-semibold text-white">{date}</p>
              <p className="mt-2 text-sm text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[
          { title: 'Document generator preview', text: 'Create privacy notices, consent notices, breach policies and vendor assessment templates.' },
          { title: 'DPO / VDPO preview', text: 'Access outsourced privacy governance, monitoring, and reporting support.' },
          { title: 'Consent support preview', text: 'Manage consent notices, logs, withdrawals, and audit trail workflows.' },
          { title: 'Breach response preview', text: 'Follow a structured incident workflow with notification templates.' },
          { title: 'Rights portal preview', text: 'Track access, correction, erasure and grievance requests with status updates.' },
          { title: 'Vendor risk preview', text: 'Monitor agreement status, risk scores and cross-border processing flags.' },
        ].map((card) => (
          <div key={card.title} className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{card.title}</p>
            <p className="mt-3 text-sm text-slate-300">{card.text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Business overview</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Arya Retail Pvt Ltd is positioned for practical DPDP readiness</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">An ecommerce business managing personal data for orders, customer service, payments and logistics with a medium-risk profile.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">Business profile</p>
            <p className="mt-2">Industry: Ecommerce</p>
            <p>Employees: 85</p>
            <p>Monthly users: 42,000</p>
            <p>Risk: Medium</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PricingPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Pricing & packages</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Flexible support for every stage of DPDP readiness</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">Choose a package for templates, ongoing support, governance reviews, or a custom rollout plan. All packages are designed for operational planning and are not a substitute for legal advice.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {pricingPlans.map((plan) => (
          <div key={plan.name} className={`rounded-[1.8rem] border p-6 ${plan.featured ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/70'}`}>
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold text-white">{plan.name}</p>
              {plan.featured ? <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Popular</span> : null}
            </div>
            <p className="mt-3 text-sm text-slate-400">{plan.description}</p>
            <p className="mt-5 text-4xl font-semibold text-white">{plan.price}</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              {plan.highlights.map((item) => <li key={item}>• {item}</li>)}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/documents" className="rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 text-sm font-semibold text-white">Start with {plan.name}</Link>
              <a href="mailto:privacy@arya-retail.example" className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Contact sales</a>
            </div>
          </div>
        ))}
      </div>
      <SectionCard title="What’s typically included">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Policy and template drafting support</li>
          <li>Readiness review and documentation checklist</li>
          <li>Workflow setup for consent, rights, and breach response</li>
          <li>Quarterly review cadence and executive reporting</li>
        </ul>
      </SectionCard>
    </div>
  );
}

export function KnowledgeHubPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">DPDPA Knowledge Hub</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Core compliance guidance for Indian businesses</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">A structured overview of the law, key terms, business obligations, rights, children’s data, and breach notification rules.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {knowledgeCards.map((card) => (
          <SectionCard key={card.title} title={card.title}>
            <p className="text-sm text-slate-400">{card.body}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.24em] text-blue-300">{card.type}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="What is DPDPA?">
        <p className="text-sm text-slate-400">The Digital Personal Data Protection Act, 2023 is India’s personal data protection law. It applies to digital personal data and focuses on consent, notice, purpose limitation, security safeguards, breach notification, children’s data, user rights, and accountability. Businesses processing personal data must build privacy workflows and maintain oversight across processing activities.</p>
      </SectionCard>

      <SectionCard title="Key Terms">
        <div className="grid gap-3 md:grid-cols-2">
          {['Data Principal', 'Data Fiduciary', 'Data Processor', 'Consent Manager', 'Data Protection Officer', 'Significant Data Fiduciary', 'Personal Data', 'Consent', 'Notice', 'Breach', 'Grievance', 'Processing'].map((term) => (
            <div key={term} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">{term}</div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Business Obligations">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Provide privacy notice.</li>
          <li>Obtain valid consent where required.</li>
          <li>Maintain consent records and logs.</li>
          <li>Protect personal data with security safeguards.</li>
          <li>Notify a breach when required.</li>
          <li>Enable Data Principal rights.</li>
          <li>Handle grievances promptly.</li>
          <li>Delete data when purpose is complete.</li>
          <li>Review vendors and processors.</li>
          <li>Handle children’s data safely.</li>
          <li>Maintain an audit trail.</li>
        </ul>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Data Principal Rights">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>Access information.</li>
            <li>Correction.</li>
            <li>Update.</li>
            <li>Erasure.</li>
            <li>Withdraw consent.</li>
            <li>Grievance redressal.</li>
            <li>Nomination.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Children Data Rules">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>Children are individuals below 18 years.</li>
            <li>Parental consent may be required.</li>
            <li>Tracking and targeted advertising may be restricted.</li>
            <li>Use age gates and restricted profiling controls.</li>
            <li>Document children data processing carefully.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Breach Notification Rules">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Identify what qualifies as a personal data breach.</li>
          <li>Contain and assess the incident.</li>
          <li>Notify affected Data Principals if required.</li>
          <li>Notify the Data Protection Board if required.</li>
          <li>Maintain an evidence log.</li>
          <li>Take corrective action and review safeguards.</li>
        </ul>
      </SectionCard>

      <SectionCard title="DPDPA Timeline">
        <div className="space-y-3">
          {[
            '11 August 2023: Digital Personal Data Protection Act, 2023 enacted.',
            '14 November 2025: DPDP Rules, 2025 notified.',
            'November 2026: Consent Manager-related framework/provisions become operational.',
            'May 2027: Major/core compliance obligations become applicable for covered businesses.',
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">{item}</div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">Dates are provided for compliance planning. Businesses should verify applicability based on official notifications and legal advice.</p>
      </SectionCard>
    </div>
  );
}

export function PenaltyRiskPage() {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filters = ['All', 'Security', 'Breach', 'Children Data', 'Consent', 'SDF', 'User Rights'];

  const visibleRows = selectedFilter === 'All'
    ? penaltyRows
    : penaltyRows.filter((row) => {
        if (selectedFilter === 'Security') return row.category.toLowerCase().includes('security') || row.control.toLowerCase().includes('security');
        if (selectedFilter === 'Breach') return row.category.toLowerCase().includes('breach') || row.scenario.toLowerCase().includes('breach');
        if (selectedFilter === 'Children Data') return row.category.toLowerCase().includes('children') || row.scenario.toLowerCase().includes('children');
        if (selectedFilter === 'Consent') return row.category.toLowerCase().includes('consent') || row.control.toLowerCase().includes('consent');
        if (selectedFilter === 'SDF') return row.category.toLowerCase().includes('significant');
        if (selectedFilter === 'User Rights') return row.category.toLowerCase().includes('data principal') || row.scenario.toLowerCase().includes('frivolous');
        return true;
      });

  const handleDownloadReport = () => {
    const headers = ['Compliance Failure', 'What It Means', 'Example Business Scenario', 'Maximum Potential Penalty', 'Recommended Control', 'Risk Level'];
    const rows = visibleRows.map((row) => [row.category, row.scenario, row.example, row.penalty, row.control, row.risk].join(',')).join('\n');
    const csv = [headers.join(','), rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dpdpa-penalty-risk-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">DPDPA Penalty & Fine Risk Dashboard</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Understand potential statutory maximum penalties for key DPDP compliance failures</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">The table below summarises common violation categories and the kinds of controls businesses should maintain. Values are illustrative and not a substitute for legal advice.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Highest Exposure', '₹250 crore'],
          ['Breach Notification Risk', '₹200 crore'],
          ['Children Data Risk', '₹200 crore'],
          ['SDF Risk', '₹150 crore'],
          ['General Violation Risk', '₹50 crore'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.6rem] border border-slate-800 bg-slate-950/95 p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button key={filter} onClick={() => setSelectedFilter(filter)} className={`rounded-full px-3 py-2 text-sm font-medium ${selectedFilter === filter ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}>
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Compliance Failure</th>
                <th className="px-4 py-3">What It Means</th>
                <th className="px-4 py-3">Example Business Scenario</th>
                <th className="px-4 py-3">Maximum Potential Penalty</th>
                <th className="px-4 py-3">Recommended Control</th>
                <th className="px-4 py-3">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70 text-slate-200">
              {visibleRows.map((row) => (
                <tr key={row.category}>
                  <td className="px-4 py-3 font-medium text-white">{row.category}</td>
                  <td className="px-4 py-3">{row.scenario}</td>
                  <td className="px-4 py-3">{row.example}</td>
                  <td className="px-4 py-3">{row.penalty}</td>
                  <td className="px-4 py-3">{row.control}</td>
                  <td className="px-4 py-3">{row.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={handleDownloadReport} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Download Penalty Risk Report</button>
          <Link to="/compliance-scanner" className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Run Compliance Scanner</Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">Penalty values shown are statutory maximums/potential exposure. Actual penalty depends on facts, investigation, applicable provisions, mitigating factors, and the decision of the Data Protection Board. This platform provides general compliance assistance and is not legal advice.</p>
      </div>
    </div>
  );
}

export function ComplianceScannerPage() {
  const [answers, setAnswers] = useState(Array(scannerQuestions.length).fill(false));
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    const yesCount = answers.filter(Boolean).length;
    const percent = Math.round((yesCount / answers.length) * 100);
    return percent;
  }, [answers]);

  const riskLevel = score >= 80 ? 'Low' : score >= 60 ? 'Medium' : 'High';
  const missingItems = [
    'Privacy Notice missing',
    'Consent logs missing',
    'Breach response policy missing',
    'Vendor risk review missing',
    'Data retention policy missing',
    'User rights request process missing',
  ];

  const recommendedActions = {
    immediate: ['Create privacy notice', 'Create consent notice', 'Start consent log', 'Create breach response process'],
    shortTerm: ['Complete data inventory', 'Review vendors', 'Create data retention policy', 'Create Data Principal request workflow'],
    mediumTerm: ['Run internal compliance audit', 'Review security safeguards', 'Prepare monthly compliance report', 'Train internal staff'],
  };

  const fineExposure = [
    'Security safeguards failure: Up to ₹250 crore',
    'Breach notification failure: Up to ₹200 crore',
    'Other Data Fiduciary violation: Up to ₹50 crore',
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">AI Compliance Risk Scanner</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Interactive readiness questionnaire</h2>
        <p className="mt-3 text-sm text-slate-400">This scanner provides a readiness overview based on common controls and practices. It is not a legal determination.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
          <div className="space-y-4">
            {scannerQuestions.map((question, index) => (
              <label key={question} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                <input type="checkbox" checked={answers[index]} onChange={() => {
                  const next = [...answers];
                  next[index] = !next[index];
                  setAnswers(next);
                }} className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950" />
                <span>{question}</span>
              </label>
            ))}
          </div>
          <button onClick={() => setSubmitted(true)} className="mt-6 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white">Submit scanner assessment</button>
        </div>
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Assessment output</p>
          {submitted ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Overall risk</p>
                <p className="mt-1 text-2xl font-semibold text-white">{riskLevel}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Compliance score</p>
                <p className="mt-1 text-2xl font-semibold text-white">{score}%</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Missing compliance items</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {missingItems.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Potential fine exposure</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {fineExposure.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Recommended action plan</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p className="font-semibold text-white">Immediate</p>
                  <ul className="space-y-1 pl-4">{recommendedActions.immediate.map((item) => <li key={item}>• {item}</li>)}</ul>
                  <p className="font-semibold text-white">Within 30 days</p>
                  <ul className="space-y-1 pl-4">{recommendedActions.shortTerm.map((item) => <li key={item}>• {item}</li>)}</ul>
                  <p className="font-semibold text-white">Within 60–90 days</p>
                  <ul className="space-y-1 pl-4">{recommendedActions.mediumTerm.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/document-generator?doc=privacy-notice" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Generate Privacy Notice</Link>
                <Link to="/penalty-risk" className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">View Penalty Risk</Link>
                <Link to="/breach-response" className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Open Breach Response Center</Link>
                <Link to="/vdpo-services" className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Explore VDPO Support</Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-400">Submit the questionnaire to see your risk score, missing items, recommended action plan, and suggested documents.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DPOServicePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">DPO as a Service</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Professional privacy governance support</h2>
        <p className="mt-3 text-sm text-slate-400">Get expert-led privacy governance support without building a full internal privacy team.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Compliance monitoring', 'Data mapping', 'Consent audit', 'Privacy notice review', 'Vendor risk review', 'Breach response support', 'Data Principal request handling', 'Monthly compliance report', 'Board communication support where applicable', 'Employee awareness support', 'DPIA support for high-risk processing', 'Children data compliance review'].map((service) => (
          <div key={service} className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">{service}</div>
        ))}
      </div>
      <SectionCard title="Who needs DPO support?">
        <p className="text-sm text-slate-400">Growing ecommerce, SaaS, agencies, schools, clinics, and service providers often need practical support to meet documentation, governance, vendor management, and request handling needs.</p>
      </SectionCard>
      <SectionCard title="Monthly deliverables">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Compliance score and gap review</li>
          <li>Consent and rights workflow summary</li>
          <li>Vendor review status update</li>
          <li>Document version and action tracker</li>
        </ul>
      </SectionCard>
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <p className="text-sm text-slate-400">DPO service availability and legal requirement depends on business category, regulatory notification, and legal assessment.</p>
      </div>
    </div>
  );
}

export function VDPOServicePage() {
  const plans = [
    { name: 'Starter VDPO', bestFor: 'Small businesses and early-stage startups', includes: ['Basic compliance checklist', 'AI policy generator', 'Privacy notice template', 'Consent flow review', 'Breach response templates', 'Monthly compliance score', 'Email support'] },
    { name: 'Pro VDPO', bestFor: 'SaaS apps, agencies, ecommerce and growing teams', includes: ['Everything in Starter', 'Data mapping support', 'Vendor risk review', 'Consent log review', 'Data Principal request workflow', 'Monthly VDPO report', 'Priority email support', 'Document review checklist'] },
    { name: 'Enterprise VDPO', bestFor: 'Larger teams and high-risk businesses', includes: ['Everything in Pro', 'Advanced compliance monitoring', 'Department-wise data inventory', 'DPIA support', 'Breach simulation checklist', 'Children data review', 'Board notification template support', 'Quarterly executive report', 'Custom workflows'] },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Virtual Data Protection Officer</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Flexible outsourced privacy support</h2>
        <p className="mt-3 text-sm text-slate-400">The VDPO module offers practical DPDP readiness support without hiring a full-time privacy officer.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-[1.8rem] border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold text-white">{plan.name}</p>
            <p className="mt-2 text-sm text-slate-400">{plan.bestFor}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {plan.includes.map((item) => <li key={item}>• {item}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/pricing" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">View pricing</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsentSupportPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Consent Management Support Tool</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Purpose-wise consent governance</h2>
        <p className="mt-3 text-sm text-slate-400">This tool helps businesses create and manage internal consent records and templates. It is not a registered Consent Manager under DPDP law.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {['Consent notice generator', 'Purpose-wise consent builder', 'Consent log table', 'Withdraw consent request form', 'Consent audit trail', 'Download consent report', 'Consent status dashboard', 'Consent version history', 'User consent preference view', 'Consent expiry/review reminder'].map((item) => (
          <div key={item} className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">{item}</div>
        ))}
      </div>
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70 text-slate-200">
              {consents.map((item) => (
                <tr key={item.id}><td className="px-4 py-3">{item.name}</td><td className="px-4 py-3">{item.purpose}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3">{item.date}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BreachCenterPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Breach Response Center</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Structured incident response workflow</h2>
        <p className="mt-3 text-sm text-slate-400">Support an orderly response to a suspected personal data breach with severity, documentation, analysis, and notification workflow.</p>
      </div>
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="space-y-3">
          {['Detect incident', 'Contain breach', 'Assess affected data', 'Identify affected Data Principals', 'Prepare user notification', 'Prepare Board notification where required', 'Take corrective action', 'Document evidence', 'Review safeguards', 'Generate incident closure report'].map((step) => (
            <div key={step} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">{step}</div>
          ))}
        </div>
      </div>
      <SectionCard title="Checklist">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Disable compromised access</li>
          <li>Preserve logs</li>
          <li>Identify affected systems</li>
          <li>Notify internal response team</li>
          <li>Draft user communication</li>
          <li>Draft Board notification</li>
          <li>Record timeline</li>
          <li>Review vendor involvement</li>
          <li>Apply corrective safeguards</li>
        </ul>
      </SectionCard>
    </div>
  );
}

export function RightsPortalPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Data Principal Rights Portal</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Track requests and support user rights</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Total requests', '24'],
          ['Pending', '8'],
          ['Completed', '14'],
          ['Escalated', '2'],
          ['Average response time', '12 days'],
          ['Due within 7 days', '3'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70 text-slate-200">
              {rightsRequests.map((request) => (
                <tr key={request.id}><td className="px-4 py-3">{request.user}</td><td className="px-4 py-3">{request.requestType}</td><td className="px-4 py-3"><StatusBadge status={request.status} /></td><td className="px-4 py-3">{request.dueDate}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DocumentGeneratorPage() {
  const [searchParams] = useSearchParams();
  const [selectedDocument, setSelectedDocument] = useState('Privacy Notice');
  const [generatedDocs, setGeneratedDocs] = useState({
    'Privacy Notice': 'Generated',
    'Consent Notice': 'Draft',
    'Data Processing Agreement': 'Draft',
    'Breach Response Policy': 'Draft',
    'Data Retention Policy': 'Draft',
    'Children Data Consent Form': 'Draft',
    'Vendor Assessment Checklist': 'Draft',
    'DPO Appointment Letter': 'Draft',
    'VDPO Monthly Report': 'Draft',
    'Data Principal Request SOP': 'Draft',
    'Grievance Redressal Policy': 'Draft',
  });
  const [noticeForm, setNoticeForm] = useState({
    businessName: 'Arya Retail Pvt Ltd',
    websiteName: 'arya-retail.in',
    dataCollected: 'Name, email, phone, address, payment data, order history',
    purpose: 'To process orders, support customers, communicate updates, and manage compliance',
    retention: 'For 3 years after account closure or as required by law',
    vendors: 'Razorpay, AWS India, Email Marketing Tool, Logistics Partner',
    contactEmail: 'privacy@aryaretail.in',
    grievanceContact: 'grievance@aryaretail.in',
    withdrawal: 'Users may withdraw consent through account settings or by emailing privacy@aryaretail.in',
  });

  const initialDoc = searchParams.get('doc') === 'privacy-notice' ? 'Privacy Notice' : selectedDocument;

  const handleGenerate = (title) => {
    setSelectedDocument(title);
    setGeneratedDocs((current) => ({ ...current, [title]: 'Generated' }));
  };

  const handleCopy = async () => {
    const text = `Privacy Notice for ${noticeForm.businessName}\n\nWe collect ${noticeForm.dataCollected} for ${noticeForm.purpose}. We retain data for ${noticeForm.retention}. We may share data with ${noticeForm.vendors}. For questions or grievances, contact ${noticeForm.contactEmail} or ${noticeForm.grievanceContact}. Consent withdrawal: ${noticeForm.withdrawal}`;
    try {
      await navigator.clipboard.writeText(text);
      window.alert('Privacy notice copied to clipboard.');
    } catch {
      window.alert('Copy failed. You can still use the preview text.');
    }
  };

  const handleDownload = () => {
    const text = `Privacy Notice for ${noticeForm.businessName}\n\nWe collect ${noticeForm.dataCollected} for ${noticeForm.purpose}. We retain data for ${noticeForm.retention}. We may share data with ${noticeForm.vendors}. For questions or grievances, contact ${noticeForm.contactEmail} or ${noticeForm.grievanceContact}. Consent withdrawal: ${noticeForm.withdrawal}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'privacy-notice-draft.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Document Generator</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Template-based documents for readiness planning</h2>
        <p className="mt-3 text-sm text-slate-400">Create and review document drafts with structured inputs. Generated documents should be reviewed by a qualified legal professional before use.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documentTemplates.map((doc) => (
          <div key={doc.title} className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{doc.title}</p>
              <StatusBadge status={generatedDocs[doc.title] || doc.status} />
            </div>
            <p className="mt-3 text-sm text-slate-400">Last generated: {doc.lastGenerated}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => handleGenerate(doc.title)} className="rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Generate</button>
              <button onClick={() => setSelectedDocument(doc.title)} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Preview</button>
              <button onClick={handleDownload} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Download</button>
              <button onClick={handleCopy} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Copy</button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Privacy Notice Builder">
          <div className="space-y-3 text-sm text-slate-300">
            {[
              ['Business name', noticeForm.businessName, (value) => setNoticeForm({ ...noticeForm, businessName: value })],
              ['Website/app name', noticeForm.websiteName, (value) => setNoticeForm({ ...noticeForm, websiteName: value })],
              ['Data collected', noticeForm.dataCollected, (value) => setNoticeForm({ ...noticeForm, dataCollected: value })],
              ['Purpose of collection', noticeForm.purpose, (value) => setNoticeForm({ ...noticeForm, purpose: value })],
              ['Retention period', noticeForm.retention, (value) => setNoticeForm({ ...noticeForm, retention: value })],
              ['Third-party vendors', noticeForm.vendors, (value) => setNoticeForm({ ...noticeForm, vendors: value })],
              ['Contact email', noticeForm.contactEmail, (value) => setNoticeForm({ ...noticeForm, contactEmail: value })],
              ['Grievance contact', noticeForm.grievanceContact, (value) => setNoticeForm({ ...noticeForm, grievanceContact: value })],
              ['Consent withdrawal method', noticeForm.withdrawal, (value) => setNoticeForm({ ...noticeForm, withdrawal: value })],
            ].map(([label, value, handler]) => (
              <label key={label} className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
                <input value={value} onChange={(event) => handler(event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none" />
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Live Preview">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
            <p className="text-lg font-semibold text-white">{selectedDocument || initialDoc}</p>
            <p className="mt-3 text-slate-400">{selectedDocument === 'Privacy Notice' || initialDoc === 'Privacy Notice' ? `Privacy Notice for ${noticeForm.businessName}` : `${selectedDocument} draft ready for review.`}</p>
            <div className="mt-4 space-y-3">
              <p><span className="font-semibold text-white">Business:</span> {noticeForm.businessName}</p>
              <p><span className="font-semibold text-white">Website:</span> {noticeForm.websiteName}</p>
              <p><span className="font-semibold text-white">We collect:</span> {noticeForm.dataCollected}</p>
              <p><span className="font-semibold text-white">Purpose:</span> {noticeForm.purpose}</p>
              <p><span className="font-semibold text-white">Retention:</span> {noticeForm.retention}</p>
              <p><span className="font-semibold text-white">Third parties:</span> {noticeForm.vendors}</p>
              <p><span className="font-semibold text-white">Contact:</span> {noticeForm.contactEmail}</p>
              <p><span className="font-semibold text-white">Grievance:</span> {noticeForm.grievanceContact}</p>
              <p><span className="font-semibold text-white">Consent withdrawal:</span> {noticeForm.withdrawal}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={handleCopy} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Copy text</button>
              <button onClick={handleDownload} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Download draft</button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export function VendorRiskPage() {
  const vendors = [
    { name: 'Razorpay', category: 'Payment Processor', data: 'Financial Data', risk: 'Medium Risk', status: 'Agreement Pending' },
    { name: 'Mailchimp', category: 'Email Marketing', data: 'Email Data', risk: 'Medium Risk', status: 'Review Due' },
    { name: 'AWS India', category: 'Cloud Hosting', data: 'Customer Data', risk: 'Low Risk', status: 'Approved' },
    { name: 'Analytics Tool', category: 'Behaviour Data', data: 'Behaviour Data', risk: 'High Risk', status: 'DPA Missing' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Vendor Risk Management</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Track processors, agreements and exposure</h2>
      </div>
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Data category</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70 text-slate-200">
              {vendors.map((vendor) => (
                <tr key={vendor.name}><td className="px-4 py-3">{vendor.name}</td><td className="px-4 py-3">{vendor.data}</td><td className="px-4 py-3">{vendor.risk}</td><td className="px-4 py-3">{vendor.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DataInventoryPage() {
  const dataAssets = [
    ['Name', 'Customer onboarding', 'Website form', 'Cloud DB', '24 months', 'No', 'Low'],
    ['Phone', 'Order updates', 'Checkout form', 'Cloud DB', '24 months', 'Yes', 'Medium'],
    ['Payment data', 'Payment capture', 'Payment gateway', 'Secure vault', '12 months', 'Yes', 'High'],
    ['Health data', 'Appointment booking', 'Clinic portal', 'Encrypted storage', '18 months', 'Yes', 'High'],
    ['Children data', 'Learning plan', 'Parent portal', 'Restricted storage', '12 months', 'No', 'High'],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Data Inventory and Mapping</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Map personal data categories to purposes, storage and vendors</h2>
      </div>
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Storage</th>
                <th className="px-4 py-3">Retention</th>
                <th className="px-4 py-3">Vendor Shared</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70 text-slate-200">
              {dataAssets.map(([category, purpose, source, storage, retention, vendor, risk]) => (
                <tr key={category}><td className="px-4 py-3">{category}</td><td className="px-4 py-3">{purpose}</td><td className="px-4 py-3">{source}</td><td className="px-4 py-3">{storage}</td><td className="px-4 py-3">{retention}</td><td className="px-4 py-3">{vendor}</td><td className="px-4 py-3">{risk}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ComplianceCalendarPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Compliance Calendar</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Plan DPDP actions and review dates</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {['Upcoming DPDP deadlines', 'Monthly consent audit', 'Quarterly vendor review', 'Annual privacy notice review', 'Breach simulation drill', 'Data retention cleanup', 'User request review', 'DPO/VDPO monthly report date'].map((item) => (
          <div key={item} className="rounded-[1.6rem] border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">{item}</div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Settings and Company Profile</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Maintain your business profile and risk posture</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Company profile">
          <div className="space-y-3 text-sm text-slate-400">
            <p><span className="text-white">Company:</span> {companyProfile.companyName}</p>
            <p><span className="text-white">Industry:</span> {companyProfile.industry}</p>
            <p><span className="text-white">Contact email:</span> {companyProfile.adminEmail}</p>
            <p><span className="text-white">DPO/contact:</span> {companyProfile.dpoName}</p>
          </div>
        </SectionCard>
        <SectionCard title="Risk profile">
          <div className="flex flex-wrap gap-2">
            {['Startup', 'MSME', 'SaaS', 'Ecommerce', 'School/EdTech', 'Clinic/HealthTech', 'Agency', 'Enterprise'].map((item) => (
              <span key={item} className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">{item}</span>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Penalty risk reference">
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Violation category</th>
                <th className="px-4 py-3">Potential maximum penalty</th>
                <th className="px-4 py-3">Suggested control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/70 text-slate-200">
              {penaltyRows.map((row) => (
                <tr key={row.category}><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3">{row.penalty}</td><td className="px-4 py-3">{row.control}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-500">Penalty values shown are statutory maximums/potential exposure. Actual penalty depends on facts, investigation, applicable provisions, mitigating factors, and decision of the Data Protection Board. This is not legal advice.</p>
      </SectionCard>
    </div>
  );
}
