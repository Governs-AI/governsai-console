// Client-safe types only
export type { AuthUser, SessionData } from './auth-server';

// Server-only functions - these should only be imported in API routes and middleware
export {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  generateOrgSlug,
  createOrganization,
  addUserToOrganization,
  createEmailVerificationToken,
  consumeVerificationToken,
  markEmailVerified,
  createPasswordResetToken,
  consumePasswordResetToken,
  clearPasswordResetToken,
  generateTotpSecret,
  verifyTotpToken,
  createUser,
  findUserByEmail,
  verifyUserPassword,
  updateUserPassword,
  getUserOrganizations,
  createVerificationToken,
  enableTotpMfa,
  disableTotpMfa,
  resetPassword
} from './auth-server';
