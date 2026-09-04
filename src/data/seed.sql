-- ============================================================
-- PrivSecure India — Supabase Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- NOTE: Seed creates demo org only. Real users are created via Auth.
-- ============================================================

-- Demo organisation (Arya Retail)
INSERT INTO public.organisations (
  id, name, display_name, industry, business_model,
  employees, monthly_users, registered_state, website, business_address
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Arya Retail Pvt Ltd',
  'Arya Retail',
  'Ecommerce',
  'D2C Ecommerce + Marketplace',
  85,
  '42,000',
  'Maharashtra',
  'https://aryaretail.example.in',
  '18, MG Road, Mumbai, Maharashtra – 400 001'
) ON CONFLICT (id) DO NOTHING;

-- Demo org settings
INSERT INTO public.organisation_settings (organisation_id, data_profile, governance) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{
    "customerData": true, "employeeData": true, "childrensData": false,
    "healthData": false, "financialData": true, "deviceAnalyticsData": true,
    "thirdPartyProcessors": true, "crossBorderProcessing": true,
    "websiteOrMobileApp": true, "aiSystems": true,
    "existingConsentRecords": true, "existingPrivacyPolicy": true
  }',
  '{
    "privacyContactName": "Maya Verma",
    "privacyContactEmail": "privacy@aryaretail.example.in",
    "grievanceOfficerName": "Ravi Kulkarni",
    "grievanceEmail": "grievance@aryaretail.example.in",
    "dpoName": "Maya Verma",
    "defaultTaskOwner": "Maya Verma"
  }'
) ON CONFLICT (organisation_id) DO NOTHING;

-- NOTE: To join this demo org after signing up, run:
-- INSERT INTO public.organisation_memberships (organisation_id, user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', '<your-auth-uid>', 'Organisation Owner');
