/**
 * PrivSecure India — Demo Workspace Data
 * Organisation: Arya Retail Pvt Ltd (Ecommerce)
 * 
 * All data is ecommerce-specific. No education, clinic, or medical data.
 * Dates are dynamically generated relative to today.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date();

function daysFromNow(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysAgo(n) {
  return daysFromNow(-n);
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Company Profile ──────────────────────────────────────────────────────────

export const companyProfile = {
  companyName: 'Arya Retail Pvt Ltd',
  displayName: 'Arya Retail',
  industry: 'Ecommerce',
  businessModel: 'D2C Ecommerce + Marketplace',
  employees: 85,
  monthlyUsers: '42,000',
  registeredState: 'Maharashtra',
  website: 'https://aryaretail.example.in',
  businessAddress: '18, MG Road, Mumbai, Maharashtra – 400 001',
  dataCategories: [
    'Customer Name',
    'Mobile Number',
    'Email Address',
    'Delivery Address',
    'Order History',
    'Payment Reference',
    'Device & Analytics Data',
    'Marketing Preferences',
    'Loyalty Points',
    'Refund Records',
    'Support Conversations',
  ],
  vendors: [
    'Razorpay (Payment Gateway)',
    'Amazon SES (Email Delivery)',
    'AWS India (Cloud Hosting)',
    'CleverTap (Analytics & Engagement)',
    'Delhivery (Delivery Partner)',
  ],
  childrenData: false,
  overallRisk: 'Medium',
  readinessScore: 64,
  adminName: 'Nikhil Sharma',
  adminEmail: 'nikhil@aryaretail.example.in',
  adminRole: 'Privacy Admin',
  privacyContactName: 'Maya Verma',
  privacyContactEmail: 'privacy@aryaretail.example.in',
  grievanceOfficerName: 'Ravi Kulkarni',
  grievanceEmail: 'grievance@aryaretail.example.in',
  isDemo: true,
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const dashboardStats = [
  {
    title: 'DPDP Readiness Score',
    value: '64%',
    change: '+4% from last quarter',
    tone: 'blue',
    detail: 'Based on 15-control assessment',
  },
  {
    title: 'Consent Coverage',
    value: '71%',
    change: '5 purpose workflows active',
    tone: 'emerald',
    detail: 'Marketing consent gap remains',
  },
  {
    title: 'Open Rights Requests',
    value: '8',
    change: `3 due by ${formatDate(daysFromNow(3))}`,
    tone: 'amber',
    detail: '2 overdue',
  },
  {
    title: 'Vendor Risk',
    value: 'Medium',
    change: '4 vendors under review',
    tone: 'rose',
    detail: '1 DPA missing',
  },
];

// ─── Activity Timeline ────────────────────────────────────────────────────────

export const dashboardActivities = [
  {
    title: 'Privacy notice reviewed and updated',
    description:
      'Updated consent language for checkout and loyalty programme communications. Version 3.1 saved.',
    time: '08:15 AM',
    date: daysAgo(0),
    user: 'Maya Verma',
    module: 'Policy',
  },
  {
    title: 'Data access request verified',
    description:
      'Identity documents checked and request routed to fulfilment team for response.',
    time: '10:30 AM',
    date: daysAgo(0),
    user: 'Nikhil Sharma',
    module: 'Rights Requests',
  },
  {
    title: 'Vendor assessment refreshed',
    description:
      'Razorpay and Amazon SES review status moved to pending approval. DPA checklist sent.',
    time: '12:45 PM',
    date: daysAgo(1),
    user: 'Ravi Kulkarni',
    module: 'Vendor Risk',
  },
  {
    title: 'Monthly readiness report generated',
    description:
      'Board summary created with risk actions, pending requests and readiness score change.',
    time: '03:05 PM',
    date: daysAgo(1),
    user: 'Nikhil Sharma',
    module: 'Reports',
  },
  {
    title: 'Consent withdrawal processed',
    description:
      'Customer Rahul Mehta withdrew marketing consent. Processing stopped and record updated.',
    time: '04:20 PM',
    date: daysAgo(2),
    user: 'Maya Verma',
    module: 'Consent',
  },
];

// ─── Pending / Priority Actions ───────────────────────────────────────────────

export const pendingActions = [
  {
    id: 'A001',
    title: 'Review marketing consent log',
    detail:
      'Add purpose-specific retention notes for marketing and promotional email consent.',
    riskLevel: 'Medium',
    dueDate: daysFromNow(5),
    owner: 'Maya Verma',
    module: 'Consent',
    status: 'Open',
  },
  {
    id: 'A002',
    title: 'Complete vendor DPA for Amazon SES',
    detail:
      'Finalise and sign the Data Processing Agreement with Amazon SES for email delivery services.',
    riskLevel: 'High',
    dueDate: daysFromNow(7),
    owner: 'Ravi Kulkarni',
    module: 'Vendor Risk',
    status: 'In Progress',
  },
  {
    id: 'A003',
    title: 'Process overdue erasure request',
    detail:
      'Customer erasure request REQ-007 is overdue by 2 days. Escalate to privacy contact.',
    riskLevel: 'High',
    dueDate: daysAgo(2),
    owner: 'Nikhil Sharma',
    module: 'Rights Requests',
    status: 'Overdue',
  },
  {
    id: 'A004',
    title: 'Archive order history older than 24 months',
    detail:
      'Retention policy requires archiving or deleting customer order data older than 24 months.',
    riskLevel: 'Medium',
    dueDate: daysFromNow(14),
    owner: 'Ravi Kulkarni',
    module: 'Data Inventory',
    status: 'Open',
  },
  {
    id: 'A005',
    title: 'Update analytics consent notice',
    detail:
      'CleverTap analytics consent notice does not reflect current data collected. Requires update.',
    riskLevel: 'Medium',
    dueDate: daysFromNow(10),
    owner: 'Maya Verma',
    module: 'Cookie Consent',
    status: 'Open',
  },
];

// ─── Recent Consent Withdrawals ───────────────────────────────────────────────

export const recentWithdrawals = [
  {
    user: 'Rahul Mehta',
    email: 'r***@example.com',
    reason: 'Marketing emails',
    date: daysAgo(1),
    status: 'Processed',
  },
  {
    user: 'Priya Sharma',
    email: 'p***@example.com',
    reason: 'Order promotional updates',
    date: daysAgo(3),
    status: 'Processed',
  },
  {
    user: 'Aman Verma',
    email: 'a***@example.com',
    reason: 'Newsletter',
    date: daysAgo(5),
    status: 'Processed',
  },
];

// ─── High-Risk Vendors ────────────────────────────────────────────────────────

export const highRiskVendors = [
  {
    name: 'CleverTap',
    service: 'Analytics & Engagement',
    risk: 'High',
    status: 'DPA missing',
    lastReview: daysAgo(90),
    nextReview: daysFromNow(0),
  },
  {
    name: 'Razorpay',
    service: 'Payment Gateway',
    risk: 'Medium',
    status: 'Agreement pending signature',
    lastReview: daysAgo(45),
    nextReview: daysFromNow(15),
  },
  {
    name: 'Amazon SES',
    service: 'Email Delivery',
    risk: 'Medium',
    status: 'Review due',
    lastReview: daysAgo(120),
    nextReview: daysFromNow(7),
  },
];

// ─── Document Progress ────────────────────────────────────────────────────────

export const documentProgress = [
  { label: 'Privacy Notice', value: 92, status: 'Reviewed' },
  { label: 'Consent Notice', value: 86, status: 'Draft' },
  { label: 'Breach Response Policy', value: 74, status: 'Draft' },
  { label: 'Vendor Assessment Checklist', value: 64, status: 'Incomplete' },
  { label: 'Retention Policy', value: 55, status: 'Draft' },
];

// ─── Consent Coverage ─────────────────────────────────────────────────────────

export const consentCoverage = [
  { label: 'Order Processing', value: 94 },
  { label: 'Marketing Emails', value: 78 },
  { label: 'Loyalty Programme', value: 72 },
  { label: 'Customer Support', value: 81 },
  { label: 'Analytics & Tracking', value: 58 },
  { label: 'Delivery Updates', value: 91 },
];

// ─── Request Status ───────────────────────────────────────────────────────────

export const requestStatus = [
  { label: 'Submitted', value: 8 },
  { label: 'Under verification', value: 3 },
  { label: 'In review', value: 5 },
  { label: 'Awaiting approval', value: 2 },
  { label: 'Completed', value: 21 },
  { label: 'Escalated', value: 1 },
];

// ─── Vendor Risk Distribution ─────────────────────────────────────────────────

export const vendorRiskDistribution = [
  { label: 'Low risk', value: 40 },
  { label: 'Medium risk', value: 45 },
  { label: 'High risk', value: 15 },
];

// ─── Consents (Ecommerce Data Only) ──────────────────────────────────────────

export const consents = [
  {
    id: 1,
    name: 'Rahul Mehta',
    email: 'r***@example.com',
    consentType: 'Marketing',
    purpose: 'Promotional emails and offers',
    status: 'Withdrawn',
    date: daysAgo(30),
    channel: 'Website checkout',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    email: 'p***@example.com',
    consentType: 'Order Processing',
    purpose: 'Order status and shipping updates',
    status: 'Active',
    date: daysAgo(20),
    channel: 'App signup',
  },
  {
    id: 3,
    name: 'Aman Verma',
    email: 'a***@example.com',
    consentType: 'Newsletter',
    purpose: 'Weekly product newsletter',
    status: 'Withdrawn',
    date: daysAgo(45),
    channel: 'Website footer',
  },
  {
    id: 4,
    name: 'Kavya Singh',
    email: 'k***@example.com',
    consentType: 'Analytics',
    purpose: 'Usage analytics and personalisation',
    status: 'Active',
    date: daysAgo(15),
    channel: 'Cookie banner',
  },
  {
    id: 5,
    name: 'Deepak Nair',
    email: 'd***@example.com',
    consentType: 'Loyalty Programme',
    purpose: 'Points tracking and rewards notifications',
    status: 'Active',
    date: daysAgo(10),
    channel: 'App loyalty enrolment',
  },
];

// ─── Rights Requests ──────────────────────────────────────────────────────────

export const rightsRequests = [
  {
    id: 'REQ-007',
    user: 'Isha Khanna',
    email: 'i***@example.com',
    requestType: 'Erasure',
    priority: 'High',
    status: 'Overdue',
    submittedDate: daysAgo(35),
    dueDate: daysAgo(2),
    description: 'Delete all personal data including order history and contact details.',
    suggestedAction:
      'Verify identity, check active order retention obligations, then process deletion across CRM, email and order database.',
  },
  {
    id: 'REQ-008',
    user: 'Rohan Bhatia',
    email: 'r***@example.com',
    requestType: 'Access',
    priority: 'Medium',
    status: 'In Review',
    submittedDate: daysAgo(5),
    dueDate: daysFromNow(25),
    description: 'Request a copy of all personal data held including order and delivery history.',
    suggestedAction: 'Prepare full data export from CRM and order database. Mask payment tokens.',
  },
  {
    id: 'REQ-009',
    user: 'Sunita Rajan',
    email: 's***@example.com',
    requestType: 'Correction',
    priority: 'Low',
    status: 'Pending',
    submittedDate: daysAgo(2),
    dueDate: daysFromNow(28),
    description: 'Correct delivery address and mobile number on customer profile.',
    suggestedAction: 'Verify new details with customer and update CRM record.',
  },
  {
    id: 'REQ-010',
    user: 'Vikram Patel',
    email: 'v***@example.com',
    requestType: 'Grievance',
    priority: 'High',
    status: 'Escalated',
    submittedDate: daysAgo(12),
    dueDate: daysFromNow(3),
    description: 'Complaint: marketing emails continued after consent withdrawal.',
    suggestedAction:
      'Review consent withdrawal log, verify email suppression list, respond with corrective action taken.',
  },
];

// ─── Incident / Breach Records (Ecommerce) ───────────────────────────────────

export const breachIncidents = [
  {
    id: 'INC-001',
    title: 'Customer order export over-disclosure',
    description:
      'A bulk CSV export included customer mobile numbers for a broader date range than intended due to a filter misconfiguration.',
    dataAffected: 'Mobile numbers, delivery addresses',
    affectedUsers: 140,
    severity: 'Medium',
    status: 'Resolved',
    detectedDate: daysAgo(30),
    containmentAction: 'Export deleted, access restricted, filter corrected.',
    childrenInvolved: false,
  },
  {
    id: 'INC-002',
    title: 'Third-party analytics misconfiguration',
    description:
      'CleverTap SDK was collecting device IDs before consent banner acknowledgement due to a script loading order error.',
    dataAffected: 'Device ID, session data',
    affectedUsers: 3200,
    severity: 'High',
    status: 'Investigating',
    detectedDate: daysAgo(7),
    containmentAction:
      'Script loading order corrected. Investigating scope of pre-consent data collection.',
    childrenInvolved: false,
  },
];

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = [
  {
    id: 'AL-0421',
    time: '09:40',
    date: daysAgo(0),
    user: 'Nikhil Sharma',
    action: 'Generated readiness report',
    module: 'Reports',
    risk: 'Medium',
    ip: '10.0.0.x',
  },
  {
    id: 'AL-0422',
    time: '11:10',
    date: daysAgo(0),
    user: 'Maya Verma',
    action: 'Updated erasure request REQ-007 status',
    module: 'Rights Requests',
    risk: 'High',
    ip: '10.0.0.x',
  },
  {
    id: 'AL-0423',
    time: '14:25',
    date: daysAgo(0),
    user: 'Ravi Kulkarni',
    action: 'Updated consent record — Rahul Mehta withdrawal',
    module: 'Consent',
    risk: 'Low',
    ip: '10.0.0.x',
  },
  {
    id: 'AL-0424',
    time: '16:05',
    date: daysAgo(0),
    user: 'Ravi Kulkarni',
    action: 'Reviewed INC-002 — analytics misconfiguration',
    module: 'Incidents',
    risk: 'High',
    ip: '10.0.0.x',
  },
  {
    id: 'AL-0425',
    time: '17:20',
    date: daysAgo(0),
    user: 'Nikhil Sharma',
    action: 'Exported vendor risk report to PDF',
    module: 'Reports',
    risk: 'Medium',
    ip: '10.0.0.x',
  },
];

// ─── Readiness Checklist ──────────────────────────────────────────────────────

export const checklistItems = [
  {
    id: 1,
    title: 'Privacy notice created and published',
    description:
      'A clear notice visible on website, app, and checkout, describing what data is collected, why and how users can exercise rights.',
    status: 'Completed',
    module: 'Policy',
    action: 'Schedule quarterly review. Ensure version history is maintained.',
  },
  {
    id: 2,
    title: 'Consent records maintained',
    description:
      'Every consent event is logged with purpose, timestamp, notice version, and channel.',
    status: 'Completed',
    module: 'Consent',
    action: 'Add renewal reminders for consent approaching expiry.',
  },
  {
    id: 3,
    title: 'Consent withdrawal process available',
    description: 'Customers can withdraw consent from all communication flows.',
    status: 'Pending',
    module: 'Consent',
    action:
      'Add one-click withdrawal link in all marketing emails and loyalty programme notifications.',
  },
  {
    id: 4,
    title: 'Data access request workflow ready',
    description: 'A standard process exists for handling customer access requests.',
    status: 'Completed',
    module: 'Rights Requests',
    action: 'Monitor SLA performance weekly. Escalate overdue items.',
  },
  {
    id: 5,
    title: 'Data correction workflow ready',
    description: 'Customers can request corrections through a verified workflow.',
    status: 'Pending',
    module: 'Rights Requests',
    action: 'Add customer-facing self-service correction form in account portal.',
  },
  {
    id: 6,
    title: 'Data erasure workflow ready',
    description: 'Erasure requests are routed to the compliance team.',
    status: 'High Risk',
    module: 'Rights Requests',
    action: 'Review retention exceptions for active orders. Update backup retention policy.',
  },
  {
    id: 7,
    title: 'Grievance contact publicly visible',
    description: 'A grievance officer name and contact is visible in the privacy notice.',
    status: 'Completed',
    module: 'Policy',
    action: 'Confirm grievance contact is reachable and escalation matrix is updated.',
  },
  {
    id: 8,
    title: 'Incident response process documented',
    description: 'Incident response playbook is documented and team is aware.',
    status: 'Completed',
    module: 'Incidents',
    action: 'Run a tabletop scenario drill with the security and fulfilment teams.',
  },
  {
    id: 9,
    title: 'Audit logs enabled',
    description: 'System events are recorded for admin and data handling actions.',
    status: 'Pending',
    module: 'Audit',
    action: 'Enable tamper-evident export for quarterly compliance audits.',
  },
  {
    id: 10,
    title: 'Monthly readiness report generated',
    description: 'A monthly readiness report is created for leadership review.',
    status: 'Completed',
    module: 'Reports',
    action: 'Include score-change reasons and top 5 risks in board summary.',
  },
];

// ─── Data Inventory (Ecommerce) ───────────────────────────────────────────────

export const dataInventory = [
  {
    id: 1,
    fieldName: 'Customer Full Name',
    category: 'Personal Data',
    purpose: 'Order fulfilment and account identification',
    system: 'CRM (Shopify)',
    storageLocation: 'AWS Mumbai',
    riskLevel: 'Medium',
    retention: '3 years after last order',
    owner: 'Operations Team',
  },
  {
    id: 2,
    fieldName: 'Mobile Number',
    category: 'Contact Data',
    purpose: 'Order and delivery status notifications',
    system: 'CRM + SMS Gateway',
    storageLocation: 'AWS Mumbai',
    riskLevel: 'Medium',
    retention: '3 years after last order',
    owner: 'Customer Success',
  },
  {
    id: 3,
    fieldName: 'Email Address',
    category: 'Contact Data',
    purpose: 'Order confirmation, marketing (with consent)',
    system: 'CRM + Amazon SES',
    storageLocation: 'AWS Mumbai + US',
    riskLevel: 'Medium',
    retention: '3 years after last order or withdrawal',
    owner: 'Marketing Team',
  },
  {
    id: 4,
    fieldName: 'Delivery Address',
    category: 'Location Data',
    purpose: 'Order delivery',
    system: 'CRM + Delhivery',
    storageLocation: 'AWS Mumbai + Delhivery India',
    riskLevel: 'High',
    retention: '3 years after last order',
    owner: 'Logistics Team',
  },
  {
    id: 5,
    fieldName: 'Payment Reference Token',
    category: 'Financial Related Data',
    purpose: 'Payment processing, refunds',
    system: 'Razorpay',
    storageLocation: 'Razorpay India servers',
    riskLevel: 'High',
    retention: '7 years (GST compliance)',
    owner: 'Finance Team',
  },
  {
    id: 6,
    fieldName: 'Order History',
    category: 'Transaction Data',
    purpose: 'Order management, returns, loyalty points',
    system: 'Shopify + Loyalty App',
    storageLocation: 'AWS Mumbai',
    riskLevel: 'Medium',
    retention: '3 years',
    owner: 'Operations Team',
  },
  {
    id: 7,
    fieldName: 'Device ID & Session Logs',
    category: 'Device & Analytics Data',
    purpose: 'Analytics, fraud prevention, personalisation',
    system: 'CleverTap',
    storageLocation: 'CleverTap — India region',
    riskLevel: 'High',
    retention: '12 months',
    owner: 'Growth Team',
  },
];

// ─── AI Insights ──────────────────────────────────────────────────────────────

export const aiInsights = [
  'Marketing email consent withdrawal rate increased 12% this month — review consent notice clarity.',
  'REQ-007 erasure request is overdue. Escalate to privacy contact immediately.',
  'CleverTap DPA is missing. This is a high-risk gap for analytics data processing.',
  'Retention policy for order data older than 24 months requires archive action by end of month.',
  'Incident INC-002 investigation is open. Ensure containment evidence is documented.',
];

// ─── Readiness Score Breakdown ────────────────────────────────────────────────

export const readinessBreakdown = {
  score: 64,
  controlsPassed: 9,
  controlsPartial: 4,
  controlsMissing: 2,
  evidenceCompleteness: 58,
  highRiskFindings: 3,
  lastUpdated: daysAgo(0),
  changeFromLast: +4,
  changeReasons: [
    { label: 'Privacy notice reviewed and updated', points: +5, direction: 'up' },
    { label: 'Erasure request REQ-007 overdue', points: -3, direction: 'down' },
    { label: 'Vendor DPA for CleverTap missing', points: -2, direction: 'down' },
    { label: 'Incident response playbook approved', points: +4, direction: 'up' },
  ],
};

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = [
  {
    id: 'V001',
    name: 'Razorpay',
    service: 'Payment Gateway',
    role: 'Data Processor',
    website: 'https://razorpay.com',
    owner: 'Finance Team',
    dataCategories: ['Payment Reference Token', 'Customer Name'],
    processingCountries: ['India'],
    certifications: ['PCI-DSS', 'ISO 27001'],
    dpaStatus: 'Pending Signature',
    contractExpiry: daysFromNow(45),
    inherentRisk: 'High',
    residualRisk: 'Medium',
    approvalStatus: 'Approved — Review Pending',
    lastAssessment: daysAgo(45),
    nextAssessment: daysFromNow(45),
  },
  {
    id: 'V002',
    name: 'Amazon SES',
    service: 'Email Delivery',
    role: 'Data Processor',
    website: 'https://aws.amazon.com/ses',
    owner: 'Marketing Team',
    dataCategories: ['Email Address', 'Customer Name'],
    processingCountries: ['India', 'US'],
    certifications: ['ISO 27001', 'SOC 2'],
    dpaStatus: 'Draft Under Review',
    contractExpiry: daysFromNow(120),
    inherentRisk: 'Medium',
    residualRisk: 'Medium',
    approvalStatus: 'Pending Approval',
    lastAssessment: daysAgo(120),
    nextAssessment: daysFromNow(7),
  },
  {
    id: 'V003',
    name: 'CleverTap',
    service: 'Analytics & Engagement',
    role: 'Data Processor',
    website: 'https://clevertap.com',
    owner: 'Growth Team',
    dataCategories: ['Device ID', 'Session Data', 'Email Address'],
    processingCountries: ['India'],
    certifications: ['ISO 27001'],
    dpaStatus: 'Missing',
    contractExpiry: daysAgo(15),
    inherentRisk: 'High',
    residualRisk: 'High',
    approvalStatus: 'Not Approved',
    lastAssessment: daysAgo(180),
    nextAssessment: daysAgo(0),
  },
  {
    id: 'V004',
    name: 'Delhivery',
    service: 'Delivery Partner',
    role: 'Data Processor',
    website: 'https://delhivery.com',
    owner: 'Logistics Team',
    dataCategories: ['Customer Name', 'Mobile Number', 'Delivery Address'],
    processingCountries: ['India'],
    certifications: [],
    dpaStatus: 'Signed',
    contractExpiry: daysFromNow(240),
    inherentRisk: 'Medium',
    residualRisk: 'Low',
    approvalStatus: 'Approved',
    lastAssessment: daysAgo(60),
    nextAssessment: daysFromNow(120),
  },
  {
    id: 'V005',
    name: 'AWS India',
    service: 'Cloud Hosting',
    role: 'Data Processor',
    website: 'https://aws.amazon.com',
    owner: 'Engineering Team',
    dataCategories: ['All customer data (hosted)'],
    processingCountries: ['India'],
    certifications: ['ISO 27001', 'SOC 2', 'PCI-DSS'],
    dpaStatus: 'Signed',
    contractExpiry: daysFromNow(180),
    inherentRisk: 'High',
    residualRisk: 'Low',
    approvalStatus: 'Approved',
    lastAssessment: daysAgo(30),
    nextAssessment: daysFromNow(330),
  },
];

// ─── Stats Overview ───────────────────────────────────────────────────────────

export const stats = [
  { title: 'Total Consent Records', value: '3,420', change: '+14.2%', tone: 'blue' },
  { title: 'Active Consents', value: '2,847', change: '+9.1%', tone: 'emerald' },
  { title: 'Withdrawn Consents', value: '221', change: '+2.3%', tone: 'amber' },
  { title: 'Open Rights Requests', value: '8', change: '+2', tone: 'rose' },
  { title: 'Open Incidents', value: '2', change: '+1', tone: 'violet' },
  { title: 'DPDP Readiness Score', value: '64/100', change: '+4', tone: 'emerald' },
  { title: 'High Risk Items', value: '5', change: '-2', tone: 'rose' },
  { title: 'Reports Generated', value: '23', change: '+6', tone: 'blue' },
];
