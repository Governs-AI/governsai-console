# Keycloak User Sync Integration - Quick Reference

## What Was Implemented

The GovernsAI Dashboard now automatically syncs users to Keycloak, enabling "Login with GovernsAI" functionality for external chatbot applications.

## Quick Start

### 1. Configure Environment Variables

Add to your `.env.local` or production environment:

```env
KEYCLOAK_BASE_URL=https://auth.governsai.com
KEYCLOAK_REALM=governs-ai
KEYCLOAK_ADMIN_CLIENT_ID=admin-sync-client
KEYCLOAK_ADMIN_CLIENT_SECRET=your-admin-client-secret
```

See [KEYCLOAK_ENV.md](./KEYCLOAK_ENV.md) for setup instructions.

### 2. Check Permissions (if getting 403 errors)

```bash
npx tsx scripts/check-keycloak-permissions.ts
```

This will test your service account permissions and show which roles are missing.

### 3. Test the Integration

```bash
npx tsx scripts/test-keycloak-sync-standalone.ts
```

Expected output: All 4 tests should pass ✅

### 4. Enable for Production

1. Set environment variables in your hosting platform
2. Verify Keycloak service account has proper permissions
3. Monitor logs for sync operations

## How It Works

### User Lifecycle Sync

The system automatically syncs users to Keycloak at these events:

1. **User Signup** → Creates user in Keycloak with org context
2. **Email Verification** → Updates `emailVerified` status
3. **Join Organization** → Updates user's org context
4. **Role Change** → Updates `org_role` attribute
5. **User Removal** → Deletes user from Keycloak

### Non-Blocking Design

All sync operations are:
- **Asynchronous**: Don't block user workflows
- **Fault-tolerant**: Failures are logged but don't break features
- **Idempotent**: Safe to retry

### Token Claims

Chatbot apps receive OIDC tokens with these custom claims:

```json
{
  "governs_user_id": "dashboard-user-id",
  "org_id": "organization-id",
  "org_slug": "organization-slug",
  "org_role": "ADMIN"
}
```

## Files Modified

- `lib/keycloak-admin.ts` - Keycloak sync service (NEW)
- `app/api/auth/signup/route.ts` - Sync on user signup
- `app/api/auth/email/verify/consume/route.ts` - Sync on email verification
- `app/api/orgs/join/route.ts` - Sync on org join
- `app/api/orgs/[orgId]/users/[userId]/route.ts` - Sync on role change and user removal

## Documentation

- **Full Integration Guide**: [docs/keycloak-integration.md](../../docs/keycloak-integration.md)
- **Environment Setup**: [KEYCLOAK_ENV.md](./KEYCLOAK_ENV.md)
- **Test Script**: [scripts/test-keycloak-sync.ts](./scripts/test-keycloak-sync.ts)

## Monitoring

Check application logs for sync status:

```bash
# Successful operations
✅ Created Keycloak user: user@example.com
✅ Updated Keycloak user: user@example.com
✅ Updated email verification for Keycloak user: user@example.com

# Errors (non-blocking)
❌ Failed to sync user to Keycloak: [error details]
⚠️  Keycloak user not found for email: user@example.com
```

## Troubleshooting

**User not syncing?**
1. Check environment variables are set
2. Verify service account permissions in Keycloak
3. Run test script to diagnose issues
4. Check application logs for errors

**Custom claims not in token?**
1. Verify `governs-claims` scope is assigned to client
2. Check user attributes in Keycloak admin console
3. Ensure mappers are configured correctly

See [docs/keycloak-integration.md](../../docs/keycloak-integration.md) for detailed troubleshooting.

## Support

For issues with the Keycloak integration, contact the GovernsAI team or check the full documentation in `docs/keycloak-integration.md`.

