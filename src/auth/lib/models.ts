// Define UUID type for consistent usage
export type UUID = string;

// Language code type for user preferences
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

// Auth model representing the authentication session
export interface AuthModel {
  access_token: string;
  refresh_token?: string;
}

// Role type for mentoring passport (Global/Legacy)
export type UserRole = 'supervisor' | 'program-member' | 'administrator' | 'org-admin';

// Specific roles within an organisation
export type MembershipRole = 'org-admin' | 'supervisor' | 'program-member';

export interface Membership {
  id: UUID;
  organisation_id: UUID;
  role: MembershipRole;
  status: 'active' | 'archived';
  organisation?: {
    name: string;
    logo_url: string | null;
  };
}

// User model representing the user profile
export interface UserModel {
  id: UUID; // User ID from auth.users
  username: string;
  password?: string; // Optional as we don't always retrieve passwords
  email: string;
  first_name: string;
  last_name: string;
  fullname?: string; // May be stored directly in metadata
  full_name?: string; // From mp_profiles
  email_verified?: boolean;
  occupation?: string;
  company_name?: string; // Using snake_case consistently
  phone?: string;
  roles?: number[]; // Array of role IDs (legacy)
  pic?: string;
  language?: LanguageCode; // Maintain existing type
  is_admin?: boolean; // Legacy/Global admin flag
  
  // Mentoring Passport specific fields from mp_profiles
  role: UserRole; // Current active role or global role
  profile_id: UUID; // Same as id, but explicit for clarity
  job_title?: string;
  avatar_url?: string;
  department?: string;
  bio?: string;
  status?: 'active' | 'archived';
  organisation_id?: UUID; // Current active organisation
  must_change_password?: boolean; // Flag to force password change on first login

  // Multi-tenant memberships
  memberships?: Membership[];
  selected_organisation_id?: UUID;
}
