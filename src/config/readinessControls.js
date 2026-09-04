export const readinessControls = [
  { id: 'notice', category: 'Transparency', question: 'Is a current privacy notice shown before or at personal-data collection?', action: 'Publish and review a purpose-specific privacy notice.' },
  { id: 'consent', category: 'Consent', question: 'Are consent events recorded with purpose, notice version, and timestamp?', action: 'Implement a versioned consent evidence register.' },
  { id: 'withdrawal', category: 'Consent', question: 'Can Data Principals withdraw consent as easily as they gave it?', action: 'Implement and test an accessible consent-withdrawal flow.' },
  { id: 'rights', category: 'Rights', question: 'Is there an authenticated workflow for access, correction, erasure, and grievance requests?', action: 'Establish a verified Data Principal request workflow.' },
  { id: 'inventory', category: 'Governance', question: 'Is there an up-to-date inventory of personal data, purposes, systems, and owners?', action: 'Complete the organisation data inventory.' },
  { id: 'retention', category: 'Lifecycle', question: 'Are retention periods documented and deletion outcomes evidenced?', action: 'Define retention schedules and evidence deletion.' },
  { id: 'vendors', category: 'Processors', question: 'Are processors risk-assessed and governed by current data-processing terms?', action: 'Review processor risk and close agreement gaps.' },
  { id: 'security', category: 'Safeguards', question: 'Are access control, encryption, monitoring, and security reviews operating?', action: 'Document and test reasonable security safeguards.' },
  { id: 'incident', category: 'Incidents', question: 'Is a tested personal-data breach response and notification process available?', action: 'Approve and exercise the incident response playbook.' },
  { id: 'children', category: 'Children', question: 'Where children data is processed, are age and parental-consent safeguards operating?', action: 'Implement children-data and parental-consent safeguards.' },
  { id: 'training', category: 'People', question: 'Do relevant staff complete recurring privacy and incident training?', action: 'Schedule role-based privacy training.' },
  { id: 'audit', category: 'Assurance', question: 'Are privacy controls reviewed periodically with evidence and accountable owners?', action: 'Schedule a recurring privacy control review.' },
];

export function calculateReadiness(answers) {
  const yes = readinessControls.filter((control) => answers[control.id] === true).length;
  const answered = readinessControls.filter((control) => typeof answers[control.id] === 'boolean').length;
  const score = Math.round((yes / readinessControls.length) * 100);
  return { yes, answered, score, riskLevel: score >= 80 ? 'Low' : score >= 60 ? 'Medium' : 'High' };
}
