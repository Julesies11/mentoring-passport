import { KeenIcon } from '@/components/keenicons';
import { type MenuConfig } from './types';

/**
 * MASTER SIDEBAR CONFIGURATION
 * This is the single source of truth for the application's main navigation.
 * Access is controlled via 'requiredRole' and 'requiredFlag' on each item.
 */
export const SIDEBAR_MENU_CONFIG: MenuConfig = [
  // --- SYSTEM LEVEL (System Owner Only) ---
  { 
    heading: 'System Management',
    requiredFlag: ['isSystemOwner'] 
  },
  {
    title: 'Admin Dashboard',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/admin/dashboard',
    requiredFlag: ['isSystemOwner']
  },
  {
    title: 'Organisations',
    icon: () => <KeenIcon icon="bank" />,
    path: '/admin/organisations',
    requiredFlag: ['isSystemOwner']
  },
  {
    title: 'Users',
    icon: () => <KeenIcon icon="users" />,
    path: '/admin/users',
    requiredFlag: ['isSystemOwner']
  },

  // --- ORGANISATION LEVEL (Org Admin Only) ---
  { 
    heading: 'Administration',
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Org Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/org-admin/hub',
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Programs',
    icon: () => <KeenIcon icon="layers" />,
    path: '/org-admin/programs',
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Manage Members',
    icon: () => <KeenIcon icon="users" />,
    path: '/org-admin/participants',
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Task Templates',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/org-admin/task-templates',
    requiredFlag: ['isOrgAdmin']
  },

  // --- SUPERVISOR LEVEL (Org Admin AND Supervisor) ---
  { 
    heading: 'Supervisor Role',
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Supervisor Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/supervisor/hub',
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Pairs',
    icon: () => <KeenIcon icon="disconnect" />,
    path: '/supervisor/pairs',
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Program Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/supervisor/program-tasks',
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Pair Management',
    icon: () => <KeenIcon icon="setting-2" />,
    path: '/supervisor/checklist',
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Evidence Review',
    icon: () => <KeenIcon icon="eye" />,
    path: '/supervisor/evidence-review',
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Calendar',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/supervisor/calendar',
    requiredFlag: ['isSupervisor']
  },

  // --- PROGRAM MEMBER LEVEL (Mentor / Mentee) ---
  { 
    heading: 'Relationship Hub',
    requiredRole: ['program-member', 'mentor', 'mentee']
  },
  {
    title: 'Relationship Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/program-member/dashboard',
    requiredRole: ['program-member', 'mentor', 'mentee']
  },
  {
    title: 'Tasks',
    icon: () => <KeenIcon icon="clipboard" />,
    path: '/program-member/tasks',
    requiredRole: ['program-member', 'mentor', 'mentee']
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/program-member/meetings',
    requiredRole: ['program-member', 'mentor', 'mentee']
  },
];

// --- LEGACY EXPORTS (Mapped to the Master Config for Backward Compatibility) ---
// These will be filtered dynamically by SidebarMenu instead of being separate arrays.
export const MENU_ADMINISTRATOR: MenuConfig = SIDEBAR_MENU_CONFIG;
export const MENU_ORG_ADMIN: MenuConfig = SIDEBAR_MENU_CONFIG;
export const MENU_SUPERVISOR: MenuConfig = SIDEBAR_MENU_CONFIG;
export const MENU_PROGRAM_MEMBER: MenuConfig = SIDEBAR_MENU_CONFIG;

// Required by Metronic for routing/layout initialization
export const MENU_SIDEBAR: MenuConfig = [];
export const MENU_SIDEBAR_CUSTOM: MenuConfig = [];
export const MENU_SIDEBAR_COMPACT: MenuConfig = [];
export const MENU_MEGA: MenuConfig = [];
export const MENU_MEGA_MOBILE: MenuConfig = [];
export const MENU_HELP: MenuConfig = [];
export const MENU_ROOT: MenuConfig = [];
