import { ROLES, PROFILE_STATUS, UserRole, ProfileStatus } from '@/config/constants';

// Define UUID type for consistent usage
export type UUID = string;

// Language code type for user preferences
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

// Auth model representing the authentication session
export interface AuthModel {
  access_token: string;
  refresh_token?: string;
}

// User model representing the user profile in a single-organisation instance
export interface UserModel {
  id: UUID; // User ID from auth.users
  username: string;
  password?: string;
  email: string;
  first_name: string;
  last_name: string;
  fullname?: string;
  full_name?: string;
  email_verified?: boolean;
  phone?: string;
  pic?: string;
  language?: LanguageCode;
  
  // Instance-specific role
  role: UserRole; 
  profile_id: UUID;
  job_title_id?: UUID;
  job_title_name?: string;
  avatar_url?: string;
  department?: string;
  bio?: string;
  status?: ProfileStatus;
  must_change_password?: boolean;
}
