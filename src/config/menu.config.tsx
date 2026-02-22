import {
  LayoutDashboard,
  Users,
  Link2,
  FileCheck,
  Archive,
  UserCircle,
  Calendar,
  ClipboardList,
  Image,
  StickyNote,
} from 'lucide-react';
import { type MenuConfig } from './types';

// Supervisor menu
export const MENU_SUPERVISOR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/supervisor/dashboard',
  },
  {
    title: 'Participants',
    icon: Users,
    path: '/supervisor/participants',
  },
  {
    title: 'Pairs',
    icon: Link2,
    path: '/supervisor/pairs',
  },
  {
    title: 'Evidence Review',
    icon: FileCheck,
    path: '/supervisor/evidence-review',
  },
  {
    title: 'Archive',
    icon: Archive,
    path: '/supervisor/archive',
  },
];

// Mentor menu
export const MENU_MENTOR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/mentor/dashboard',
  },
  {
    title: 'My Mentees',
    icon: Users,
    path: '/mentor/mentees',
  },
  {
    title: 'Meetings',
    icon: Calendar,
    path: '/mentor/meetings',
  },
  {
    title: 'Tasks',
    icon: ClipboardList,
    path: '/mentor/tasks',
  },
  {
    title: 'Evidence',
    icon: Image,
    path: '/mentor/evidence',
  },
  {
    title: 'Notes',
    icon: StickyNote,
    path: '/mentor/notes',
  },
];

// Mentee menu
export const MENU_MENTEE: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/mentee/dashboard',
  },
  {
    title: 'My Mentor',
    icon: UserCircle,
    path: '/mentee/mentor',
  },
  {
    title: 'Meetings',
    icon: Calendar,
    path: '/mentee/meetings',
  },
  {
    title: 'Checklist',
    icon: ClipboardList,
    path: '/mentee/checklist',
  },
  {
    title: 'Evidence',
    icon: Image,
    path: '/mentee/evidence',
  },
  {
    title: 'Notes',
    icon: StickyNote,
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
