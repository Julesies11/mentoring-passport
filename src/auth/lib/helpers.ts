import { getData, setData } from '@/lib/storage';
import { AuthModel } from './models';

const AUTH_LOCAL_STORAGE_KEY = `${import.meta.env.VITE_APP_NAME}-auth-v${
  import.meta.env.VITE_APP_VERSION || '1.0'
}`;

const PROFILE_LOCAL_STORAGE_KEY = `${import.meta.env.VITE_APP_NAME}-profile-v${
  import.meta.env.VITE_APP_VERSION || '1.0'
}`;

/**
 * Get stored auth information from local storage
 */
const getAuth = (): AuthModel | undefined => {
  try {
    const auth = getData(AUTH_LOCAL_STORAGE_KEY) as AuthModel | undefined;
    return auth;
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error);
  }
};

/**
 * Save auth information to local storage
 */
const setAuth = (auth: AuthModel) => {
  setData(AUTH_LOCAL_STORAGE_KEY, auth);
};

/**
 * Get stored profile information from local storage
 */
const getProfileCache = (): UserModel | undefined => {
  try {
    return getData(PROFILE_LOCAL_STORAGE_KEY) as UserModel | undefined;
  } catch (error) {
    console.error('PROFILE LOCAL STORAGE PARSE ERROR', error);
  }
};

/**
 * Save profile information to local storage
 */
const setProfileCache = (profile: UserModel) => {
  setData(PROFILE_LOCAL_STORAGE_KEY, profile);
};

/**
 * Remove auth and profile information from local storage
 */
const removeAuth = () => {
  if (!localStorage) {
    return;
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
    localStorage.removeItem(PROFILE_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error);
  }
};

export { AUTH_LOCAL_STORAGE_KEY, getAuth, removeAuth, setAuth, getProfileCache, setProfileCache };
