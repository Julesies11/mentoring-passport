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
    title: 'System Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/sys-admin/dashboard',
    requiredRole: [ROLES.ADMINISTRATOR]
  },
  {
    title: 'Instance Settings',
    icon: () => <KeenIcon icon="bank" />,
    path: '/sys-admin/settings',
    requiredRole: [ROLES.ADMINISTRATOR]
  },
  {
    title: 'User Directory',
    icon: () => <KeenIcon icon="users" />,
    path: '/sys-admin/users',
    requiredRole: [ROLES.ADMINISTRATOR]
  },

  // --- ORGANISATION ADMINISTRATION LEVEL (Org Admin) ---
  {
    title: 'Admin Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/admin/dashboard',
    requiredRole: [ROLES.ORG_ADMIN]
  },
  {
    title: 'Programs',
    icon: () => <KeenIcon icon="layers" />,
    path: '/admin/programs',
    requiredRole: [ROLES.ORG_ADMIN]
  },
  {
    title: 'Organisation Pairs',
    icon: () => <KeenIcon icon="disconnect" />,
    path: '/admin/pairs',
    requiredRole: [ROLES.ORG_ADMIN]
  },
  {
    title: 'Manage Members',
    icon: () => <KeenIcon icon="users" />,
    path: '/admin/participants',
    requiredRole: [ROLES.ORG_ADMIN]
  },
  {
    title: 'Audit Evidence',
    icon: () => <KeenIcon icon="eye" />,
    path: '/admin/evidence-audit',
    requiredRole: [ROLES.ORG_ADMIN]
  },
  {
    title: 'Task Templates',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/admin/task-templates',
    requiredRole: [ROLES.ORG_ADMIN]
  },

  // --- SUPERVISOR LEVEL ---
  {
    title: 'Supervisor Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/supervisor/hub',
    requiredRole: [ROLES.SUPERVISOR]
  },
  {
    title: 'Pairs',
    icon: () => <KeenIcon icon="disconnect" />,
    path: '/supervisor/pairs',
    requiredRole: [ROLES.SUPERVISOR]
  },
  {
    title: 'Program Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/supervisor/program-tasks',
    requiredRole: [ROLES.SUPERVISOR]
  },
  {
    title: 'Pair Management',
    icon: () => <KeenIcon icon="setting-2" />,
    path: '/supervisor/checklist',
    requiredRole: [ROLES.SUPERVISOR]
  },
  {
    title: 'Evidence Review',
    icon: () => <KeenIcon icon="eye" />,
    path: '/supervisor/evidence-review',
    requiredRole: [ROLES.SUPERVISOR]
  },
  {
    title: 'Calendar',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/supervisor/calendar',
    requiredRole: [ROLES.SUPERVISOR]
  },

  // --- PROGRAM MEMBER LEVEL (Mentor / Mentee) ---
  {
    title: 'Relationship Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/program-member/dashboard',
    requiredRole: [ROLES.PROGRAM_MEMBER]
  },
  {
    title: 'Tasks',
    icon: () => <KeenIcon icon="clipboard" />,
    path: '/program-member/tasks',
    requiredRole: [ROLES.PROGRAM_MEMBER]
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/program-member/meetings',
    requiredRole: [ROLES.PROGRAM_MEMBER]
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
