import 'server-only';

import KcAdminClient from '@keycloak/keycloak-admin-client';

let kcAdminClient: KcAdminClient | null = null;

/**
 * Get or create singleton Keycloak Admin Client
 * Authenticates using service account credentials
 */
async function getKeycloakAdmin(): Promise<KcAdminClient> {
  if (!kcAdminClient) {
    const rawBaseUrl = process.env.KEYCLOAK_BASE_URL;
    const realm = process.env.KEYCLOAK_REALM || 'governs-ai';
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

    if (!rawBaseUrl || !clientId || !clientSecret) {
      console.warn('Keycloak environment variables not configured. Skipping sync.');
      throw new Error('Keycloak configuration missing');
    }

    // Normalize base URL to avoid duplicate `/realms/...` segments when the
    // underlying client builds token and admin URLs.
    const baseUrl = normalizeKeycloakBaseUrl(rawBaseUrl);

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
  /**
   * Optional plaintext password to set in Keycloak.
   *
   * We cannot derive this from the dashboard DB (we only store a hash), so this
   * should only be provided at the time the user enters it (e.g. signup).
   *
   * IMPORTANT: This is only used when creating a new Keycloak user. We do NOT
   * reset passwords for existing Keycloak users during sync.
   */
  password?: string;
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

    // If we don't have a plaintext password, we should NOT create a new Keycloak user.
    // Creating a user without setting credentials can leave them unable to log in.
    // In those cases, only update an existing Keycloak user (if present).
    if (!params.password) {
      const users = await admin.users.find({ email: params.email, exact: true });

      if (users.length === 0 || !users[0].id) {
        console.warn(
          `⚠️  Skipping Keycloak user creation without password for ${params.email} (user not found in Keycloak)`
        );
        return {
          success: false,
          error: new Error('Keycloak user not found; password not provided for creation'),
        };
      }

      const keycloakUserId = users[0].id;
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
      return { success: true, keycloakUserId };
    }

    // Create-first: in normal flows, users are not pre-registered in Keycloak.
    // If a conflict occurs (e.g. retries / race), we fall back to updating the
    // existing Keycloak user by email.
    try {
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

      const keycloakUserId = response.id;

      // Password setting is a separate concern from user creation.
      // If password setting fails, we roll back the created Keycloak user to avoid
      // leaving a user that can never sign in (and to allow clean retries).
      try {
        await admin.users.resetPassword({
          id: keycloakUserId,
          credential: {
            temporary: false,
            type: 'password',
            value: params.password,
          },
        });
      } catch (passwordError) {
        console.error(
          `Keycloak user created but failed to set password for ${params.email}:`,
          passwordError
        );
        try {
          await admin.users.del({ id: keycloakUserId });
          console.warn(
            `⚠️  Rolled back Keycloak user after password-set failure: ${params.email}`
          );
        } catch (cleanupError) {
          console.error(
            `❌ Failed to roll back Keycloak user after password-set failure for ${params.email}:`,
            cleanupError
          );
        }
        throw passwordError;
      }

      console.log(`✅ Created Keycloak user: ${params.email}`);
      return { success: true, keycloakUserId };
    } catch (error: any) {
      if (!isKeycloakConflictError(error)) throw error;

      const existingUsers = await admin.users.find({
        email: params.email,
        exact: true,
      });

      if (existingUsers.length === 0 || !existingUsers[0].id) {
        // Conflict but we can't resolve it to a user record (unexpected).
        throw error;
      }

      const keycloakUserId = existingUsers[0].id;

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

      // If we are in a retry scenario during signup, allow the password to be set
      // even though the user already exists (heals partial failures).
      try {
        await admin.users.resetPassword({
          id: keycloakUserId,
          credential: {
            temporary: false,
            type: 'password',
            value: params.password,
          },
        });
      } catch (passwordError) {
        console.error(
          `Keycloak user exists but failed to set password for ${params.email}:`,
          passwordError
        );
      }

      console.log(`✅ Updated Keycloak user (after conflict): ${params.email}`);
      return { success: true, keycloakUserId };
    }

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

function normalizeKeycloakBaseUrl(url: string): string {
  // Remove any trailing slashes first
  let cleaned = url.replace(/\/$/, '');
  // If the URL already includes a realm segment, strip it off so that
  // `realmName` exclusively controls the realm path.
  // Matches: .../realms/<anything>(/admin...)?
  cleaned = cleaned.replace(/\/(realms\/[^/]+)(?:\/.*)?$/, '');
  return cleaned;
}

function isKeycloakConflictError(error: any): boolean {
  // The keycloak-admin-client errors can vary; treat HTTP 409 as "already exists".
  const status =
    error?.response?.status ??
    error?.response?.statusCode ??
    error?.status ??
    error?.statusCode;

  return status === 409;
}

