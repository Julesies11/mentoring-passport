// Define UUID type for consistent usage
export type UUID = string;

// Language code type for user preferences
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

// Auth model representing the authentication session
export interface AuthModel {
  access_token: string;
  refresh_token?: string;
}

// Role type for mentoring passport
export type UserRole = 'supervisor' | 'program-member';

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
  is_admin?: boolean; // Added admin flag
  
  // Mentoring Passport specific fields from mp_profiles
  role: UserRole; // supervisor or program-member
  profile_id: UUID; // Same as id, but explicit for clarity
  job_title?: string;
  avatar_url?: string;
  department?: string;
  bio?: string;
  status?: 'active' | 'archived';
  must_change_password?: boolean; // Flag to force password change on first login
}
