export const stats = [
  { title: 'Total Consents', value: '2,840', change: '+12.4%', tone: 'blue' },
  { title: 'Active Consents', value: '2,410', change: '+8.2%', tone: 'emerald' },
  { title: 'Withdrawn Consents', value: '186', change: '-2.1%', tone: 'amber' },
  { title: 'Pending Requests', value: '24', change: '+4', tone: 'rose' },
  { title: 'Breach Incidents', value: '3', change: '+1', tone: 'violet' },
  { title: 'Compliance Score', value: '82/100', change: '+3', tone: 'emerald' },
  { title: 'High Risk Items', value: '7', change: '-1', tone: 'rose' },
  { title: 'Reports Generated', value: '18', change: '+5', tone: 'blue' },
];

export const dashboardStats = [
  { title: 'Overall compliance score', value: '64%', change: '+8% from last quarter', tone: 'blue' },
  { title: 'Consent coverage', value: '71% complete', change: '5 key consent workflows', tone: 'emerald' },
  { title: 'Pending requests', value: '8', change: '3 due this week', tone: 'amber' },
  { title: 'Vendor risk score', value: 'Medium', change: '4 vendors under review', tone: 'rose' },
];

export const dashboardActivities = [
  { title: 'Privacy notice reviewed', description: 'Updated notice language for checkout and loyalty communications.', time: '08:15 AM' },
  { title: 'Data access request verified', description: 'Identity documents were checked and the request was routed for response.', time: '10:30 AM' },
  { title: 'Vendor assessment refreshed', description: 'Razorpay and Mailchimp review status moved to pending approval.', time: '12:45 PM' },
  { title: 'Compliance report generated', description: 'Monthly board summary created with risk actions and deadlines.', time: '03:05 PM' },
];

export const pendingActions = [
  { title: 'Consent log review', detail: 'Add purpose-specific retention notes for marketing consent.' },
  { title: 'Vendor assessment', detail: 'Complete security review and DPA for Mailchimp.' },
  { title: 'Retention cleanup', detail: 'Archive order history older than 24 months based on retention policy.' },
];

export const recentWithdrawals = [
  { user: 'Rahul Mehta', reason: 'Marketing emails' },
  { user: 'Priya Sharma', reason: 'Order updates' },
  { user: 'Aman Verma', reason: 'Newsletter' },
];

export const highRiskVendors = [
  { name: 'Analytics Tool', risk: 'High risk', status: 'DPA missing' },
  { name: 'Razorpay', risk: 'Medium risk', status: 'Agreement pending' },
  { name: 'Mailchimp', risk: 'Medium risk', status: 'Review due' },
];

export const documentProgress = [
  { label: 'Privacy Notice', value: 92 },
  { label: 'Consent Notice', value: 86 },
  { label: 'Breach Response Policy', value: 74 },
  { label: 'Vendor Assessment Checklist', value: 64 },
];

export const consentCoverage = [
  { label: 'Marketing', value: 81 },
  { label: 'Order Processing', value: 92 },
  { label: 'Support', value: 74 },
  { label: 'Analytics', value: 61 },
];

export const requestStatus = [
  { label: 'Submitted', value: 8 },
  { label: 'Under verification', value: 5 },
  { label: 'In review', value: 6 },
  { label: 'Completed', value: 14 },
  { label: 'Escalated', value: 2 },
];

export const vendorRiskDistribution = [
  { label: 'Low risk', value: 28 },
  { label: 'Medium risk', value: 52 },
  { label: 'High risk', value: 20 },
];

export const consents = [
  {
    id: 1,
    name: 'Rahul Mehta',
    email: 'rahul@example.com',
    consentType: 'Marketing',
    purpose: 'Marketing Emails',
    status: 'Active',
    date: '2026-01-12',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    email: 'priya@example.com',
    consentType: 'Order Processing',
    purpose: 'Order updates',
    status: 'Active',
    date: '2026-01-18',
  },
  {
    id: 3,
    name: 'Aman Verma',
    email: 'aman@example.com',
    consentType: 'Newsletter',
    purpose: 'Product updates',
    status: 'Withdrawn',
    date: '2026-01-21',
  },
  {
    id: 4,
    name: 'Kavya Singh',
    email: 'kavya@example.com',
    consentType: 'App Analytics',
    purpose: 'Usage insights',
    status: 'Active',
    date: '2026-01-25',
  },
];

export const rightsRequests = [
  {
    id: 1,
    user: 'Isha Khanna',
    email: 'isha@example.com',
    requestType: 'Deletion',
    priority: 'High',
    status: 'In Review',
    submittedDate: '2026-06-24',
    dueDate: '2026-06-28',
    aiAction: 'Verify identity, check retention rules, then process deletion.',
  },
  {
    id: 2,
    user: 'Rohan Bhatia',
    email: 'rohan@example.com',
    requestType: 'Access',
    priority: 'Medium',
    status: 'Pending',
    submittedDate: '2026-06-25',
    dueDate: '2026-06-29',
    aiAction: 'Prepare user data summary and verify request.',
  },
];

export const breachIncidents = [
  {
    id: 1,
    title: 'Student portal export exposure',
    dataAffected: 'Contact details',
    affectedUsers: 320,
    severity: 'Medium',
    status: 'Investigating',
    actionTaken: 'Access restricted and logs reviewed',
  },
  {
    id: 2,
    title: 'CRM sync delay anomaly',
    dataAffected: 'Attendance and profile data',
    affectedUsers: 1250,
    severity: 'High',
    status: 'Resolved',
    actionTaken: 'Reconciled sync and notified admin',
  },
];

export const auditLogs = [
  {
    time: '09:40',
    user: 'Nikhil Sharma',
    action: 'Generated privacy notice',
    module: 'Notice',
    risk: 'Medium',
  },
  {
    time: '11:10',
    user: 'Maya Verma',
    action: 'Created deletion request',
    module: 'Rights',
    risk: 'High',
  },
  {
    time: '14:25',
    user: 'Ritika Singh',
    action: 'Updated consent record',
    module: 'Consent',
    risk: 'Low',
  },
  {
    time: '16:05',
    user: 'Ravi Kulkarni',
    action: 'Reviewed breach incident',
    module: 'Breach',
    risk: 'High',
  },
  {
    time: '17:20',
    user: 'Nikhil Sharma',
    action: 'Generated compliance report',
    module: 'Reports',
    risk: 'Medium',
  },
];

export const checklistItems = [
  {
    id: 1,
    title: 'Privacy notice created',
    description: 'A clear notice for learners and parents is updated on the portal.',
    status: 'Completed',
    module: 'Notice',
    action: 'Keep notice versioned and reviewed monthly.',
  },
  {
    id: 2,
    title: 'Consent records maintained',
    description: 'Every consent event is logged with purpose and timestamp.',
    status: 'Completed',
    module: 'Consent',
    action: 'Add consent renewal reminders for students.',
  },
  {
    id: 3,
    title: 'Consent withdrawal option available',
    description: 'Users can withdraw consent from all communication flows.',
    status: 'Pending',
    module: 'Consent',
    action: 'Add a one-click withdrawal banner in the portal.',
  },
  {
    id: 4,
    title: 'Data access request workflow ready',
    description: 'A standard process exists for access requests.',
    status: 'Completed',
    module: 'Rights',
    action: 'Track SLA performance weekly.',
  },
  {
    id: 5,
    title: 'Data correction workflow ready',
    description: 'Users can request corrections through a verified workflow.',
    status: 'Pending',
    module: 'Rights',
    action: 'Add field-level validation to improve quality.',
  },
  {
    id: 6,
    title: 'Data deletion workflow ready',
    description: 'Deletion requests are routed to the compliance team.',
    status: 'High Risk',
    module: 'Rights',
    action: 'Review retention exceptions and backup retention policy.',
  },
  {
    id: 7,
    title: 'Grievance contact added',
    description: 'A grievance officer contact is visible in the privacy notice.',
    status: 'Completed',
    module: 'Notice',
    action: 'Share escalation matrix with support teams.',
  },
  {
    id: 8,
    title: 'Breach response process ready',
    description: 'Your incident response playbook is documented.',
    status: 'Completed',
    module: 'Breach',
    action: 'Run a scenario drill with the security team.',
  },
  {
    id: 9,
    title: 'Audit logs enabled',
    description: 'System events are recorded for admin and data handling actions.',
    status: 'Pending',
    module: 'Audit',
    action: 'Enable tamper-evident export for quarterly audits.',
  },
  {
    id: 10,
    title: 'Monthly compliance report generated',
    description: 'A monthly compliance report is created for leadership review.',
    status: 'Completed',
    module: 'Reports',
    action: 'Publish comparator metrics to the board pack.',
  },
];

export const dataInventory = [
  {
    id: 1,
    fieldName: 'Student Name',
    category: 'Personal Data',
    purpose: 'Admission',
    storageLocation: 'CRM',
    riskLevel: 'Low',
  },
  {
    id: 2,
    fieldName: 'Phone Number',
    category: 'Contact Data',
    purpose: 'Communication',
    storageLocation: 'CRM',
    riskLevel: 'Medium',
  },
  {
    id: 3,
    fieldName: 'Parent Contact',
    category: 'Contact Data',
    purpose: 'Emergency updates',
    storageLocation: 'CRM',
    riskLevel: 'Medium',
  },
  {
    id: 4,
    fieldName: 'Payment Status',
    category: 'Financial Related Data',
    purpose: 'Fee tracking',
    storageLocation: 'Billing System',
    riskLevel: 'High',
  },
  {
    id: 5,
    fieldName: 'Attendance',
    category: 'Academic Data',
    purpose: 'Performance tracking',
    storageLocation: 'LMS',
    riskLevel: 'Medium',
  },
];

export const aiInsights = [
  'Consent withdrawal process needs improvement.',
  '2 rights requests are pending review.',
  'Privacy notice should mention data retention period.',
  'No critical breach open currently.',
];

export const companyProfile = {
  companyName: 'Arya Retail Pvt Ltd',
  industry: 'Ecommerce',
  employees: 85,
  monthlyUsers: '42,000',
  dataCategories: ['Name', 'Phone', 'Email', 'Address', 'Payment Data', 'Order History'],
  vendors: ['Razorpay', 'AWS India', 'Email Marketing Tool', 'Logistics Partner'],
  childrenData: 'No',
  overallRisk: 'Medium',
  complianceScore: '64%',
  adminName: 'Nikhil Sharma',
  adminEmail: 'nikhil@aryaretail.in',
  dpoName: 'Maya Verma',
  dpoEmail: 'dpo@aryaretail.in',
  grievanceOfficerName: 'Ravi Kulkarni',
  grievanceEmail: 'grievance@aryaretail.in',
  businessAddress: '18, MG Road, Mumbai, Maharashtra',
};
