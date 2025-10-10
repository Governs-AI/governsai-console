#!/usr/bin/env tsx

/**
 * Check Keycloak service account permissions
 * 
 * This script helps diagnose permission issues by testing
 * the service account's access to various Keycloak endpoints.
 * 
 * Run with: npx tsx scripts/check-keycloak-permissions.ts
 */

import KcAdminClient from '@keycloak/keycloak-admin-client';

async function checkPermissions() {
  console.log('🔍 Checking Keycloak Service Account Permissions\n');
  console.log('===============================================\n');

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
    process.exit(1);
  }

  console.log('✅ Environment variables configured\n');

  try {
    // Initialize admin client
    const admin = new KcAdminClient({
      baseUrl: process.env.KEYCLOAK_BASE_URL!,
      realmName: process.env.KEYCLOAK_REALM || 'governs-ai',
    });

    // Authenticate
    console.log('🔐 Authenticating service account...');
    await admin.auth({
      grantType: 'client_credentials',
      clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET!,
    });
    console.log('✅ Authentication successful\n');

    // Test 1: List users (requires view-users)
    console.log('Test 1: Listing users (requires view-users permission)...');
    try {
      const users = await admin.users.find({ max: 1 });
      console.log(`✅ Can list users (found ${users.length} users)\n`);
    } catch (error: any) {
      console.log(`❌ Cannot list users: ${error.message}\n`);
    }

    // Test 2: Search users by email (requires query-users)
    console.log('Test 2: Searching users by email (requires query-users permission)...');
    try {
      const users = await admin.users.find({ 
        email: 'test@example.com',
        exact: true 
      });
      console.log(`✅ Can search users by email (found ${users.length} users)\n`);
    } catch (error: any) {
      console.log(`❌ Cannot search users: ${error.message}\n`);
    }

    // Test 3: Get realm info (requires view-realm)
    console.log('Test 3: Getting realm info (requires view-realm permission)...');
    try {
      const realm = await admin.realms.findOne({ realm: process.env.KEYCLOAK_REALM || 'governs-ai' });
      console.log(`✅ Can access realm info (realm: ${realm?.realm})\n`);
    } catch (error: any) {
      console.log(`❌ Cannot access realm info: ${error.message}\n`);
    }

    // Test 4: List clients (requires view-clients)
    console.log('Test 4: Listing clients (requires view-clients permission)...');
    try {
      const clients = await admin.clients.find({ max: 1 });
      console.log(`✅ Can list clients (found ${clients.length} clients)\n`);
    } catch (error: any) {
      console.log(`❌ Cannot list clients: ${error.message}\n`);
    }

    console.log('===============================================\n');
    console.log('📋 Permission Summary:\n');
    console.log('If any tests failed with 403 Forbidden, you need to assign additional roles:');
    console.log('1. Go to Keycloak Admin Console → Clients → admin-sync-client → Service account roles');
    console.log('2. Click "Assign role" → Filter by clients: realm-management');
    console.log('3. Assign these roles:');
    console.log('   - manage-users (for user operations)');
    console.log('   - view-users (for listing/searching users)');
    console.log('   - query-users (for user queries)');
    console.log('   - manage-clients (for user operations)');
    console.log('   - view-clients (for client operations)');
    console.log('   - manage-realm (for realm operations)');
    console.log('   - view-realm (for realm access)');
    console.log('4. Click "Assign"');
    console.log('5. Test again with: npx tsx scripts/check-keycloak-permissions.ts\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run permission check
checkPermissions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
