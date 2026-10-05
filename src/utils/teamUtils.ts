import { TeamMember } from '../types';

/**
 * Filter predicate to identify active telecallers and sales calling executives
 * eligible to receive and work confidential customer lead batches.
 * 
 * Strictly excludes:
 * - Admin accounts (Executive Director, Super Admin, portal: admin, TNX-AD01)
 * - HR accounts (HR Head, People Operations, portal: hr, TNX-HR01, TNX-8817)
 * - Team Leader accounts (Team Leader & Sales Coach, portal: team_leader)
 * - Executive / non-calling management roles
 * - Deactivated accounts (active === 0)
 */
export const isTelecallerOrCallingEmployee = (m: TeamMember): boolean => {
  if (!m || m.active === 0) return false;

  const portal = (m.portal || '').toLowerCase().trim();
  const role = (m.role || '').toLowerCase().trim();
  const name = (m.name || '').toLowerCase().trim();
  const empCode = (m.empCode || '').toUpperCase().trim();

  // 1. Exclude Admin
  if (
    portal === 'admin' || 
    empCode === 'TNX-AD01' || 
    role.includes('admin') || 
    name.includes('admin') ||
    role.includes('executive director')
  ) {
    return false;
  }

  // 2. Exclude HR
  if (
    portal === 'hr' || 
    empCode.startsWith('TNX-HR') || 
    role.includes('hr') || 
    role.includes('human resources') || 
    role.includes('people operations') || 
    name.includes('hr')
  ) {
    return false;
  }

  // 3. Exclude Team Leader & Sales Coaches
  if (
    portal === 'team_leader' || 
    role.includes('team leader') || 
    role.includes('team lead') || 
    role.includes('sales coach') || 
    role.includes('coach') || 
    role.includes('supervisor')
  ) {
    return false;
  }

  // 4. Exclude other non-calling backoffice/finance roles if present
  if (
    role.includes('finance') || 
    role.includes('accountant') || 
    role.includes('director') || 
    role.includes('operations manager')
  ) {
    return false;
  }

  return true;
};
