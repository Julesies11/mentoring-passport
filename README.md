# Mentoring Passport

A comprehensive mentoring program management system built with React, Supabase, and Metronic UI.

## Overview

Mentoring Passport is a web application designed to facilitate and track mentoring relationships in professional settings. It provides role-based dashboards for supervisors, mentors, and mentees, with features for task tracking, evidence submission, meeting management, and real-time notifications.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Framework**: Metronic v9.4.0 (demo1), Tailwind CSS 4.x
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State Management**: TanStack React Query
- **Routing**: React Router DOM
- **Icons**: Lucide React

## Features

### ✅ Implemented

#### Authentication & Authorization
- Supabase email/password authentication
- Role-based access control (Supervisor, Mentor, Mentee)
- User profiles stored in `mp_profiles` table
- Quick test login for development

#### Role-Based Navigation
- **Supervisor**: Dashboard, Participants, Pairs, Evidence Review, Archive
- **Mentor**: Dashboard, My Mentees, Meetings, Tasks, Evidence, Notes
- **Mentee**: Dashboard, My Mentor, Meetings, Checklist, Evidence, Notes
- Responsive sidebar (desktop) and bottom navigation bar (mobile)

#### Universal Notifications System
- Database-driven notifications with automatic triggers
- Real-time updates via Supabase Realtime
- Notification types: evidence uploaded/reviewed, notes added, meetings created, pairs created, tasks completed
- Unread count badge on notification bell
- Mark as read/delete functionality

#### Database Schema
All tables use `mp_` prefix:
- `mp_profiles` - User profiles with roles
- `mp_pairs` - Mentor-mentee pairings
- `mp_tasks` - Standard task list (16 tasks)
- `mp_evidence_types` - Lookup table for evidence types
- `mp_pair_tasks` - Task completion tracking per pair
- `mp_evidence` - Evidence submissions with approval workflow
- `mp_meetings` - Meeting scheduling
- `mp_notes` - Shared and private notes
- `mp_notifications` - Universal notification system

### 🚧 To Be Implemented

- Participant management (CRUD)
- Pair creation and management
- Task completion workflow
- Evidence upload and review
- Meeting scheduling
- Notes creation and sharing
- Progress tracking and reporting
- Archive functionality

## Prerequisites

- Node.js 16.x or higher
- npm or Yarn
- Supabase account and project

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mentoring-passport
   ```

2. **Install dependencies**
   ```bash
   npm install --force
   ```
   *Note: `--force` flag is required for React 19 compatibility*

3. **Configure environment variables**
   
   Update `.env` with your Supabase credentials:
   ```
   VITE_APP_NAME=mentoring-passport
   VITE_APP_VERSION=1.0.0
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run database migrations**
   
   In Supabase SQL Editor, run:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_notification_triggers.sql`

5. **Create test user**
   
   In Supabase SQL Editor, run:
   - `supabase/create-test-user.sql`
   
   This creates:
   - Email: `admin@test.com`
   - Password: `Admin123!`
   - Role: Supervisor

## Development

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5174/auth/signin`

## Testing

### Quick Login
Click the **"🚀 Quick Test Login"** button on the sign-in page to instantly log in as the test supervisor.

### Test Accounts
- **Supervisor**: admin@test.com / Admin123!

### Testing Notifications
Notifications are automatically created when:
- Evidence is uploaded
- Evidence is approved/rejected
- Notes are added (non-private)
- Meetings are created
- Pairs are created
- Tasks are completed

## Project Structure

```
src/
├── auth/                    # Authentication system
│   ├── adapters/           # Supabase adapter
│   ├── context/            # Auth context with role helpers
│   ├── providers/          # Auth provider
│   └── require-role.tsx    # Role-based route guard
├── components/
│   └── notifications/      # Notification components
├── config/
│   └── menu.config.tsx     # Role-based menu configurations
├── hooks/
│   └── use-notifications.ts # Notifications hook with real-time
├── layouts/
│   └── demo1/              # Main layout with sidebar/bottom nav
├── lib/
│   └── api/
│       └── notifications.ts # Notifications API service
├── pages/
│   ├── supervisor/         # Supervisor pages
│   ├── mentor/             # Mentor pages
│   └── mentee/             # Mentee pages
└── routing/
    └── app-routing-setup.tsx # Role-based routing

supabase/
├── migrations/
│   ├── 001_schema.sql      # Database schema
│   └── 002_notification_triggers.sql # Notification triggers
└── create-test-user.sql    # Test user creation
```

## Database Schema Highlights

### User Roles
- `supervisor` - Manages participants, pairs, and reviews evidence
- `mentor` - Guides mentees through tasks
- `mentee` - Completes tasks with mentor support

### Task Evidence Types
- N/A
- Photo evidence
- Screenshot of mandatory training required
- Mentee and Mentor to keep a copy themselves
- Mentee and Mentor to keep their own notes
- Mentee and Mentor to keep their own notes / reflection

### Standard Tasks (16 total)
1. Initial contact
2. Mentoring meeting 1 (with agreement, skill sharing, goal setting)
3. Food/drink meeting
4. Sport/outdoor activity meeting
5. Arts/cultural/educational activity meeting
6. Challenges (team photo, training completion, recipe sharing, media discussion)
7. Reflections (skill sharing, goal setting)
8. Additional meetings

## Contributing

This is a private project. For issues or feature requests, contact the development team.

## License

Proprietary - All rights reserved
