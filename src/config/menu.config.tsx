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

// Program Member menu (for both Mentor and Mentee)
export const MENU_PROGRAM_MEMBER: MenuConfig = [
  {
    title: 'Dashboard',
    icon: () => <KeenIcon icon="element-11" />,
    path: '/program-member/dashboard',
  },
  {
    heading: 'Mentoring Tools'
  },
  {
    title: 'My Mentees',
    icon: () => <KeenIcon icon="users" />,
    path: '/program-member/mentees',
  },
  {
    title: 'My Mentor',
    icon: () => <KeenIcon icon="profile-circle" />,
    path: '/program-member/mentor',
  },
  {
    title: 'Meetings',
    icon: () => <KeenIcon icon="calendar" />,
    path: '/program-member/meetings',
  },
  {
    title: 'Checklist',
    icon: () => <KeenIcon icon="check-squared" />,
    path: '/program-member/checklist',
  },
  {
    title: 'Tasks',
    icon: () => <KeenIcon icon="clipboard" />,
    path: '/program-member/tasks',
  },
  {
    title: 'Evidence',
    icon: () => <KeenIcon icon="eye" />,
    path: '/program-member/evidence',
  },
  {
    title: 'Notes',
    icon: () => <KeenIcon icon="notepad" />,
    path: '/program-member/notes',
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
