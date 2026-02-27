import { KeenIcon } from '@/components/keenicons';
import { type MenuConfig } from './types';

// Supervisor menu
export const MENU_SUPERVISOR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/supervisor/dashboard',
  },
  {
    title: 'Participants',
    icon: () => <KeenIcon icon="user" />,
    path: '/supervisor/participants',
  },
  {
    title: 'Pairs',
    icon: () => <KeenIcon icon="users" />,
    path: '/supervisor/pairs',
  },
  {
    title: 'Master Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/supervisor/master-tasks',
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

// Mentor menu
export const MENU_MENTOR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/mentor/dashboard',
  },
  {
    title: 'My Mentees',
    icon: () => <KeenIcon icon="users" />,
    path: '/mentor/mentees',
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/mentor/meetings',
  },
  {
    title: 'Tasks',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/mentor/tasks',
  },
  {
    title: 'Evidence',
    icon: () => <KeenIcon icon="eye" />,
    path: '/mentor/evidence',
  },
  {
    title: 'Notes',
    icon: () => <KeenIcon icon="notepad" />,
    path: '/mentor/notes',
  },
];

// Mentee menu
export const MENU_MENTEE: MenuConfig = [
  {
    title: 'Dashboard',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/mentee/dashboard',
  },
  {
    title: 'My Mentor',
    icon: () => <KeenIcon icon="users" />,
    path: '/mentee/mentor',
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/mentee/meetings',
  },
  {
    title: 'Checklist',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/mentee/checklist',
  },
  {
    title: 'Evidence',
    icon: () => <KeenIcon icon="eye" />,
    path: '/mentee/evidence',
  },
  {
    title: 'Notes',
    icon: () => <KeenIcon icon="notepad" />,
    path: '/mentee/notes',
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
