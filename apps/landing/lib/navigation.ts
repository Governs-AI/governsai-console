// Simple navigation configuration for GovernsAI landing page
export const getDashboardUrl = () => {
  return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
};

export const getDocsUrl = () => {
  return process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001';
};

export const getLandingUrl = () => {
  return process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3000';
};

export const getAuthUrl = () => {
  return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
};

export const getResumeUrl = () => {
  return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
};

export const getInterviewUrl = () => {
  return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
};

export const getStudioUrl = () => {
  return process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:3002';
};