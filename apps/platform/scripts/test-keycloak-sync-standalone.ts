#!/usr/bin/env tsx

/**
 * Standalone test script for Keycloak user synchronization
 * 
 * This script tests the Keycloak integration by directly calling the functions
 * without importing server-only modules.
 * 
 * Run with: npx tsx scripts/test-keycloak-sync-standalone.ts
 */

import KcAdminClient from '@keycloak/keycloak-admin-client';
import { randomBytes } from 'crypto';

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_ORG_ID = `test-org-${Date.now()}`;
const TEST_ORG_SLUG = `test-org-slug`;
const TEST_PASSWORD =
  process.env.KEYCLOAK_TEST_PASSWORD || `Test-${randomBytes(12).toString('hex')}`;

// Direct implementation of sync functions for testing
async function getKeycloakAdmin(): Promise<KcAdminClient> {
  const baseUrl = process.env.KEYCLOAK_BASE_URL;
  const realm = process.env.KEYCLOAK_REALM || 'governs-ai';
  const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error('Keycloak configuration missing');
  }

  const kcAdminClient = new KcAdminClient({
    baseUrl,
    realmName: realm,
  });

  await kcAdminClient.auth({
    grantType: 'client_credentials',
    clientId,
    clientSecret,
  });

  return kcAdminClient;
}

async function syncUserToKeycloak(params: {
  userId: string;
  email: string;
  name?: string;
  password?: string;
  emailVerified: boolean;
  orgId: string;
  orgSlug: string;
  role: string;
}): Promise<{ success: boolean; keycloakUserId?: string; error?: any }> {
  try {
    const admin = await getKeycloakAdmin();

    if (!params.password) {
      const existingUsers = await admin.users.find({
        email: params.email,
        exact: true,
      });

      const keycloakUserId = existingUsers[0]?.id;
      if (!keycloakUserId) {
        return {
          success: false,
          error: new Error('Keycloak user not found; password not provided for creation'),
        };
      }

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
        } catch {
          // best-effort cleanup in test script
        }
        throw passwordError;
      }

      console.log(`✅ Created Keycloak user: ${params.email}`);
      return { success: true, keycloakUserId };
    } catch (error: any) {
      const status =
        error?.response?.status ??
        error?.response?.statusCode ??
        error?.status ??
        error?.statusCode;

      if (status !== 409) throw error;

      const existingUsers = await admin.users.find({
        email: params.email,
        exact: true,
      });

      const keycloakUserId = existingUsers[0]?.id;
      if (!keycloakUserId) throw error;

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

async function updateEmailVerificationInKeycloak(
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

async function updateUserOrgInKeycloak(
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

async function removeUserFromKeycloak(
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

async function runTests() {
  console.log('🧪 Testing Keycloak User Sync Integration\n');
  console.log('========================================\n');

  // Check if environment variables are set
  const requiredEnvVars = [
    'KEYCLOAK_BASE_URL',
    'KEYCLOAK_REALM', 
    'KEYCLOAK_ADMIN_CLIENT_ID',
    'KEYCLOAK_ADMIN_CLIENT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\nPlease set these variables in your .env.local file or environment.');
    console.log('See KEYCLOAK_ENV.md for setup instructions.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables configured\n');

  try {
    // Test 1: Create user in Keycloak
    console.log('Test 1: Creating user in Keycloak...');
    const createResult = await syncUserToKeycloak({
      userId: TEST_USER_ID,
      email: TEST_EMAIL,
      name: 'Test User',
      password: TEST_PASSWORD,
      emailVerified: false,
      orgId: TEST_ORG_ID,
      orgSlug: TEST_ORG_SLUG,
      role: 'ADMIN',
    });

    if (createResult.success) {
      console.log(`✅ User created successfully`);
      console.log(`   Keycloak User ID: ${createResult.keycloakUserId}\n`);
    } else {
      console.log(`❌ User creation failed:`, createResult.error, '\n');
      throw new Error('User creation failed');
    }

    // Wait a moment for Keycloak to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Update email verification
    console.log('Test 2: Updating email verification status...');
    const verifyResult = await updateEmailVerificationInKeycloak(
      TEST_EMAIL,
      true
    );

    if (verifyResult.success) {
      console.log('✅ Email verification updated successfully\n');
    } else {
      console.log('❌ Email verification update failed:', verifyResult.error, '\n');
    }

    // Wait a moment for Keycloak to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 3: Update org/role
    console.log('Test 3: Updating org and role...');
    const updateResult = await updateUserOrgInKeycloak(
      TEST_EMAIL,
      'new-org-id-123',
      'new-org-slug',
      'OWNER'
    );

    if (updateResult.success) {
      console.log('✅ Org/role updated successfully\n');
    } else {
      console.log('❌ Org/role update failed:', updateResult.error, '\n');
    }

    // Wait a moment for Keycloak to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 4: Delete user
    console.log('Test 4: Deleting user from Keycloak...');
    const deleteResult = await removeUserFromKeycloak(TEST_EMAIL);

    if (deleteResult.success) {
      console.log('✅ User deleted successfully\n');
    } else {
      console.log('❌ User deletion failed:', deleteResult.error, '\n');
    }

    console.log('========================================\n');
    console.log('🎉 All tests completed!\n');
    console.log('Summary:');
    console.log(`  ✓ User creation: ${createResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Email verification: ${verifyResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ Org/role update: ${updateResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ✓ User deletion: ${deleteResult.success ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    
    // Cleanup: try to delete the test user if it was created
    console.log('\n🧹 Attempting cleanup...');
    try {
      await removeUserFromKeycloak(TEST_EMAIL);
      console.log('✅ Cleanup successful');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup failed (user may not exist)');
    }
    
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
