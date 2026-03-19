import { ROLES } from './constants';
import { 
  KeenIcon 
} from '@/components/keenicons';

import { type MenuConfig } from './types';

/**
 * MASTER SIDEBAR CONFIGURATION
 * This is the single source of truth for the application's main navigation.
 * Access is controlled via 'requiredRole' and 'requiredFlag' on each item.
 */
export const SIDEBAR_MENU_CONFIG: MenuConfig = [
  // --- SYSTEM ADMINISTRATION LEVEL (Sys Admin only) ---
  {
    heading: 'System'
  },
  {
    title: 'System Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/sys-admin/dashboard',
    requiredRole: [ROLES.ADMINISTRATOR],
    requiredFlag: ['isSysAdmin']
  },
  {
    title: 'Instance Settings',
    icon: () => <KeenIcon icon="bank" />,
    path: '/sys-admin/settings',
    requiredRole: [ROLES.ADMINISTRATOR],
    requiredFlag: ['isSysAdmin']
  },

  // --- ORGANISATION ADMINISTRATION LEVEL (Org Admin) ---
  {
    heading: 'Administration'
  },
  {
    title: 'Admin Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/admin/dashboard',
    requiredRole: [ROLES.ORG_ADMIN],
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Manage Members',
    icon: () => <KeenIcon icon="users" />,
    path: '/admin/participants',
    requiredRole: [ROLES.ORG_ADMIN],
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Programs',
    icon: () => <KeenIcon icon="layers" />,
    path: '/admin/programs',
    requiredRole: [ROLES.ORG_ADMIN],
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Task Templates',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/admin/task-templates',
    requiredRole: [ROLES.ORG_ADMIN],
    requiredFlag: ['isOrgAdmin']
  },
  {
    title: 'Job Titles',
    icon: () => <KeenIcon icon="briefcase" />,
    path: '/admin/job-titles',
    requiredRole: [ROLES.ORG_ADMIN],
    requiredFlag: ['isOrgAdmin']
  },

  // --- SUPERVISOR LEVEL ---
  {
    heading: 'Supervisor Role'
  },
  {
    title: 'Supervisor Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/supervisor/hub',
    requiredRole: [ROLES.SUPERVISOR],
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Pairs',
    icon: () => <KeenIcon icon="disconnect" />,
    path: '/supervisor/pairs',
    requiredRole: [ROLES.SUPERVISOR],
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Program Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/supervisor/program-tasks',
    requiredRole: [ROLES.SUPERVISOR],
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Pair Management',
    icon: () => <KeenIcon icon="setting-2" />,
    path: '/supervisor/checklist',
    requiredRole: [ROLES.SUPERVISOR],
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Evidence Review',
    icon: () => <KeenIcon icon="eye" />,
    path: '/supervisor/evidence-review',
    requiredRole: [ROLES.SUPERVISOR],
    requiredFlag: ['isSupervisor']
  },
  {
    title: 'Calendar',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/supervisor/calendar',
    requiredRole: [ROLES.SUPERVISOR],
    requiredFlag: ['isSupervisor']
  },

  // --- PROGRAM MEMBER LEVEL (Mentor / Mentee) ---
  {
    heading: 'Member Hub'
  },
  {
    title: 'Relationship Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/program-member/dashboard',
    requiredRole: [ROLES.PROGRAM_MEMBER],
    requiredFlag: ['isProgramMember']
  },
  {
    title: 'Tasks',
    icon: () => <KeenIcon icon="clipboard" />,
    path: '/program-member/tasks',
    requiredRole: [ROLES.PROGRAM_MEMBER],
    requiredFlag: ['isProgramMember']
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/program-member/meetings',
    requiredRole: [ROLES.PROGRAM_MEMBER],
    requiredFlag: ['isProgramMember']
  },
];

// --- LEGACY EXPORTS (Mapped to the Master Config for Backward Compatibility) ---
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
