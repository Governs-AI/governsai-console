import 'server-only';

import KcAdminClient from '@keycloak/keycloak-admin-client';
import { randomBytes } from 'crypto';

let kcAdminClient: KcAdminClient | null = null;

/**
 * Get or create singleton Keycloak Admin Client
 * Authenticates using service account credentials
 */
async function getKeycloakAdmin(): Promise<KcAdminClient> {
  if (!kcAdminClient) {
    const baseUrl = process.env.KEYCLOAK_BASE_URL;
    const realm = process.env.KEYCLOAK_REALM || 'governs-ai';
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

    if (!baseUrl || !clientId || !clientSecret) {
      console.warn('Keycloak environment variables not configured. Skipping sync.');
      throw new Error('Keycloak configuration missing');
    }

    kcAdminClient = new KcAdminClient({
      baseUrl,
      realmName: realm,
    });

    try {
      // Authenticate using service account (client credentials)
      await kcAdminClient.auth({
        grantType: 'client_credentials',
        clientId,
        clientSecret,
      });

      console.log('✅ Keycloak Admin Client authenticated successfully');
    } catch (error) {
      console.error('❌ Failed to authenticate Keycloak Admin Client:', error);
      kcAdminClient = null;
      throw error;
    }
  }

  return kcAdminClient;
}

export interface SyncUserToKeycloakParams {
  userId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  orgId: string;
  orgSlug: string;
  role: string; // OWNER, ADMIN, DEVELOPER, VIEWER
}

/**
 * Sync user to Keycloak (create or update)
 * Stores org context in user attributes for OIDC token claims
 */
export async function syncUserToKeycloak(
  params: SyncUserToKeycloakParams
): Promise<{ success: boolean; keycloakUserId?: string; error?: any }> {
  try {
    const admin = await getKeycloakAdmin();

    // Check if user already exists
    const existingUsers = await admin.users.find({
      email: params.email,
      exact: true,
    });

    let keycloakUserId: string;

    if (existingUsers.length > 0) {
      // Update existing user
      keycloakUserId = existingUsers[0].id!;

      await admin.users.update(
        { id: keycloakUserId },
        {
          email: params.email,
          emailVerified: params.emailVerified,
          enabled: true,
          attributes: {
            governs_user_id: [params.userId],
            org_id: [params.orgId],
            org_slug: [params.orgSlug],
            org_role: [params.role],
          },
        }
      );

      console.log(`✅ Updated Keycloak user: ${params.email}`);
    } else {
      // Create new user
      const response = await admin.users.create({
        username: params.email,
        email: params.email,
        emailVerified: params.emailVerified,
        enabled: true,
        firstName: params.name?.split(' ')[0],
        lastName: params.name?.split(' ').slice(1).join(' '),
        attributes: {
          governs_user_id: [params.userId],
          org_id: [params.orgId],
          org_slug: [params.orgSlug],
          org_role: [params.role],
        },
      });

      keycloakUserId = response.id;

      // Set a temporary password (users should manage passwords via dashboard)
      await admin.users.resetPassword({
        id: keycloakUserId,
        credential: {
          temporary: true,
          type: 'password',
          value: generateSecureRandomPassword(),
        },
      });

      console.log(`✅ Created Keycloak user: ${params.email}`);
    }

    return { success: true, keycloakUserId };
  } catch (error) {
    console.error('❌ Failed to sync user to Keycloak:', error);
    return { success: false, error };
  }
}

/**
 * Update email verification status in Keycloak
 */
export async function updateEmailVerificationInKeycloak(
  email: string,
  emailVerified: boolean
): Promise<{ success: boolean; error?: any }> {
  try {
    const admin = await getKeycloakAdmin();

    const users = await admin.users.find({ email, exact: true });

    if (users.length > 0) {
      await admin.users.update(
        { id: users[0].id! },
        {
          emailVerified,
        }
      );
      console.log(`✅ Updated email verification for Keycloak user: ${email}`);
    } else {
      console.warn(`⚠️  Keycloak user not found for email: ${email}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update email verification in Keycloak:', error);
    return { success: false, error };
  }
}

/**
 * Update user's organization and role in Keycloak
 * Since users belong to only one org at a time, this updates their org context
 */
export async function updateUserOrgInKeycloak(
  email: string,
  orgId: string,
  orgSlug: string,
  role: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const admin = await getKeycloakAdmin();

    const users = await admin.users.find({ email, exact: true });

    if (users.length > 0) {
      await admin.users.update(
        { id: users[0].id! },
        {
          attributes: {
            ...users[0].attributes,
            org_id: [orgId],
            org_slug: [orgSlug],
            org_role: [role],
          },
        }
      );
      console.log(`✅ Updated org for Keycloak user: ${email}`);
    } else {
      console.warn(`⚠️  Keycloak user not found for email: ${email}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update user org in Keycloak:', error);
    return { success: false, error };
  }
}

/**
 * Remove user from Keycloak
 * Called when user is removed from their org (since they can only belong to one org)
 */
export async function removeUserFromKeycloak(
  email: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const admin = await getKeycloakAdmin();

    const users = await admin.users.find({ email, exact: true });

    if (users.length > 0) {
      await admin.users.del({ id: users[0].id! });
      console.log(`✅ Deleted Keycloak user: ${email}`);
    } else {
      console.warn(`⚠️  Keycloak user not found for deletion: ${email}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete user from Keycloak:', error);
    return { success: false, error };
  }
}

/**
 * Generate a secure random password for Keycloak users
 * Users manage passwords through the dashboard, not Keycloak
 */
function generateSecureRandomPassword(): string {
  return randomBytes(32).toString('hex');
}

