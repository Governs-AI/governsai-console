import { getEntryPointUrl, navigationUrls } from '@governs-ai/common-utils';

export interface UserActionHandlers {
  profile: () => void;
  settings: () => void;
  logout: () => void;
  dashboard: () => void;
  resume: () => void;
  interview: () => void;
  resumeStudio: () => void;
}

export const createUserActionHandlers = (
  router: any,
  signOut: any,
  currentApp: string = 'dashboard'
): UserActionHandlers => {
  return {
    profile: () => {
      // Profile should go to the main dashboard
      if (currentApp !== 'dashboard') {
        window.location.href = navigationUrls.platform.profile();
      } else {
        router.push('/profile');
      }
    },
    settings: () => {
      // Settings should go to the main dashboard
      if (currentApp !== 'dashboard') {
        window.location.href = navigationUrls.platform.settings();
      } else {
        router.push('/settings');
      }
    },
    logout: () => {
      // Logout should redirect to the entry point
      signOut({ callbackUrl: getEntryPointUrl() });
    },
    dashboard: () => {
      if (currentApp !== 'dashboard') {
        window.location.href = navigationUrls.platform.dashboard();
      }
    },
    resume: () => {
      if (currentApp !== 'resume') {
        window.location.href = navigationUrls.platform.policies();
      }
    },
    interview: () => {
      if (currentApp !== 'interview') {
        window.location.href = navigationUrls.platform.usage();
      }
    },
    resumeStudio: () => {
      if (currentApp !== 'resume-studio') {
        window.location.href = navigationUrls.platform.audit();
      }
    },
  };
};

export const handleUserAction = (
  action: string,
  handlers: UserActionHandlers
): void => {
  switch (action) {
    case 'profile':
      handlers.profile();
      break;
    case 'settings':
      handlers.settings();
      break;
    case 'logout':
      handlers.logout();
      break;
    case 'dashboard':
      handlers.dashboard();
      break;
    case 'resume':
      handlers.resume();
      break;
    case 'interview':
      handlers.interview();
      break;
    case 'resumeStudio':
      handlers.resumeStudio();
      break;
    default:
      console.log('Unknown user action:', action);
  }
}; 