import { KeenIcon } from '@/components/keenicons';
import { type MenuConfig } from './types';

// Administrator menu
export const MENU_ADMINISTRATOR: MenuConfig = [
  {
    title: 'Admin Dashboard',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/admin/dashboard',
  },
  {
    title: 'Organisations',
    icon: () => <KeenIcon icon="bank" />,
    path: '/admin/organisations',
  },
  {
    title: 'Users',
    icon: () => <KeenIcon icon="users" />,
    path: '/admin/users',
  },
];

// Supervisor menu
export const MENU_SUPERVISOR: MenuConfig = [
  {
    title: 'Supervisor Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/supervisor/hub',
  },
  {
    title: 'Pairs',
    icon: () => <KeenIcon icon="disconnect" />,
    path: '/supervisor/pairs',
  },
  {
    title: 'Program Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/supervisor/program-tasks',
  },
  {
    title: 'Pair Management',
    icon: () => <KeenIcon icon="setting-2" />,
    path: '/supervisor/checklist',
  },
  {
    title: 'Evidence Review',
    icon: () => <KeenIcon icon="eye" />,
    path: '/supervisor/evidence-review',
  },
  {
    title: 'Calendar',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/supervisor/calendar',
  },
];

// Org Admin menu
export const MENU_ORG_ADMIN: MenuConfig = [
  { heading: 'Administration' },
  {
    title: 'Org Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/org-admin/hub',
  },
  {
    title: 'Programs',
    icon: () => <KeenIcon icon="layers" />,
    path: '/org-admin/programs',
  },
  {
    title: 'Manage Members',
    icon: () => <KeenIcon icon="users" />,
    path: '/org-admin/participants',
  },
  {
    title: 'Task Templates',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/org-admin/task-templates',
  },
  { heading: 'Supervisor Role' },
  {
    title: 'Supervisor Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/supervisor/hub',
  },
  {
    title: 'Pairs',
    icon: () => <KeenIcon icon="disconnect" />,
    path: '/supervisor/pairs',
  },
  {
    title: 'Program Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/supervisor/program-tasks',
  },
  {
    title: 'Pair Management',
    icon: () => <KeenIcon icon="setting-2" />,
    path: '/supervisor/checklist',
  },
  {
    title: 'Evidence Review',
    icon: () => <KeenIcon icon="eye" />,
    path: '/supervisor/evidence-review',
  },
  {
    title: 'Calendar',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/supervisor/calendar',
  },
];


// Program Member menu (for both Mentor and Mentee)
export const MENU_PROGRAM_MEMBER: MenuConfig = [
  {
    title: 'Relationship Hub',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/program-member/dashboard',
  },
  {
    title: 'Tasks',
    icon: () => <KeenIcon icon="clipboard" />,
    path: '/program-member/tasks',
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/program-member/meetings',
  },
];

// Default sidebar menu (fallback)
export const MENU_SIDEBAR: MenuConfig = [];

// Legacy exports for compatibility
export const MENU_SIDEBAR_CUSTOM: MenuConfig = [];
export const MENU_SIDEBAR_COMPACT: MenuConfig = [];
export const MENU_MEGA: MenuConfig = [];
export const MENU_MEGA_MOBILE: MenuConfig = [];
export const MENU_HELP: MenuConfig = [];
export const MENU_ROOT: MenuConfig = [];
