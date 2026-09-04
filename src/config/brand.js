/**
 * PrivSecure India — Central Brand Configuration
 * All product name references must come from this file.
 * Do NOT hard-code brand names in component or page files.
 */

export const brand = {
  // Product identity
  name: 'Privora AI',
  shortName: 'Privora',
  tagline: 'Secure Data. Build Trust. Stay Ready.',
  description:
    'Privora AI is an AI-powered privacy readiness, data governance and DPDP compliance operations platform for Indian businesses.',

  // Positioning
  platformLabel: 'AI-Powered Privacy & DPDP Operations Platform',
  heroHeadline: 'Build Privacy Readiness. Reduce Risk. Earn Customer Trust.',
  heroSubline:
    'Privora AI helps Indian organisations manage DPDP readiness, privacy workflows, consent, vendors, Data Principal requests and audit evidence from one secure platform.',

  // Score terminology — never use "legally certified compliance score"
  scoreLabel: 'DPDP Readiness Score',
  scoreSublabel: 'AI-suggested readiness indicator — requires human review',

  // Legal disclaimer — include on assessment outputs, reports, penalties page
  disclaimer:
    'Privora AI provides technology-assisted privacy readiness, documentation and workflow support. It does not provide legal advice, legal certification or guaranteed compliance. Organisations should seek qualified professional review where necessary.',

  // Contact
  supportEmail: 'support@privora.ai',
  salesEmail: 'sales@privora.ai',
  demoEmail: 'demo@privora.ai',

  // URLs (placeholders — update when domain is live)
  websiteUrl: 'https://privora.ai',
  privacyPolicyUrl: 'https://privora.ai/privacy',
  termsUrl: 'https://privora.ai/terms',
  responsibleDisclosureUrl: 'https://privora.ai/responsible-disclosure',

  // Social links (placeholders)
  social: {
    linkedin: 'https://linkedin.com/company/privsecure-india',
    twitter: 'https://twitter.com/privsecurein',
  },

  // Legal entity (placeholder — do not invent registration numbers)
  legalName: '[Legal Entity Name] — PrivSecure India',
  registeredState: 'India',

  // Logo assets
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
    favicon: '/favicon.svg',
    socialPreview: '/social-preview.png',
  },

  // Colour palette tokens (mirrors tailwind config)
  colors: {
    navy: '#0a1628',
    navyDark: '#060f1e',
    accent: '#10b981', // emerald-500
    accentBlue: '#2563eb', // blue-600
  },
};

export default brand;
