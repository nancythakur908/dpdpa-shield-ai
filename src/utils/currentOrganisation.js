import dbStore from './dbStore';

export async function resolveCurrentOrganisationId() {
  const stored = sessionStorage.getItem('privsecure_current_org');
  if (stored) return stored;
  const memberships = await dbStore.getUserOrgs();
  const organisationId = memberships[0]?.organisations?.id;
  if (!organisationId) throw new Error('No active organisation membership was found.');
  sessionStorage.setItem('privsecure_current_org', organisationId);
  return organisationId;
}
