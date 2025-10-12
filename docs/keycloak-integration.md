# Keycloak Integration Guide

## Overview

The GovernsAI Dashboard integrates with Keycloak to provide "Login with GovernsAI" functionality for external chatbot applications. This integration enables:

- **Single Sign-On (SSO)** for chatbot apps using OpenID Connect (OIDC)
- **User synchronization** from dashboard to Keycloak
- **Organization context** in OIDC tokens (org_id, org_slug, role)
- **Unified identity management** across the GovernsAI ecosystem

## Architecture

```
┌─────────────────────────────────────────────┐
│     GovernsAI Dashboard (Primary Auth)      │
│                                             │
│  • Email/password authentication           │
│  • Email verification                      │
│  • MFA/TOTP support                        │
│  • Passkey authentication                  │
│  • Organization management                 │
│                                             │
│  ← Primary source of truth for users       │
└──────────────┬──────────────────────────────┘
               │
               │ One-way sync via Admin API
               │ (Non-blocking, async)
               ▼
┌──────────────────────────────────────────────┐
│    Keycloak (auth.governsai.com)            │
│                                              │
│  • Mirrors user accounts                    │
│  • Stores org context in user attributes    │
│  • Issues OIDC tokens with custom claims    │
│  • Provides OIDC endpoints for apps         │
└──────────────┬───────────────────────────────┘
               │
               │ OIDC Authorization Code Flow
               │
               ▼
    ┌─────────────────────┐
    │   Chatbot Apps      │
    │   (External Apps)   │
    │                     │
    │  • "Login with      │
    │    GovernsAI"       │
    │  • Receive tokens   │
    │    with org context │
    │  • Call GovernsAI   │
    │    APIs with token  │
    └─────────────────────┘
```

## Setup Instructions

### 1. Keycloak Configuration

#### Create Admin Service Account

1. **Navigate to Keycloak Admin Console**
   - Go to: `https://auth.governsai.com/admin`
   - Select realm: `governs-ai`

2. **Create Client for Admin API**
   - Go to: Clients → Create client
   - **General Settings**:
     - Client type: `OpenID Connect`
     - Client ID: `admin-sync-client`
     - Name: `Admin Sync Service`
     - Description: `Service account for syncing users from dashboard`
     - Click "Next"
   
   - **Capability config**:
     - ☑ Client authentication: **ON**
     - ☐ Authorization: **OFF**
     - Authentication flow:
       - ☐ Standard flow: **OFF**
       - ☐ Direct access grants: **OFF**
       - ☑ Service accounts roles: **ON** ← IMPORTANT
     - Click "Next"
   
   - **Login settings**:
     - (Leave all fields empty - service account doesn't need URLs)
     - Click "Save"

3. **Grant Admin Permissions**
   - Go to: Clients → `admin-sync-client` → Service account roles
   - Click "Assign role"
   - Filter by clients: Select `realm-management`
   - Select these roles:
     - ☑ `manage-users`
     - ☑ `view-users`
     - ☑ `query-users`
     - ☑ `manage-clients` (needed for user operations)
     - ☑ `view-clients` (needed for user operations)
     - ☑ `manage-realm` (needed for user operations)
     - ☑ `view-realm` (needed for user operations)
   - Click "Assign"

4. **Get Client Secret**
   - Go to: Clients → `admin-sync-client` → Credentials tab
   - Copy the "Client secret" value
   - Save this securely - you'll need it for environment variables

#### Create Custom Client Scope for Org Claims

1. **Create Client Scope**
   - Go to: Client Scopes → Create client scope
   - **Settings**:
     - Name: `governs-claims`
     - Description: `Custom claims for GovernsAI org context`
     - Type: `Default`
     - Protocol: `openid-connect`
     - Display on consent screen: **OFF**
     - Include in token scope: **ON**
   - Click "Save"

2. **Add Mappers for Custom Attributes**
   - Go to: Client Scopes → `governs-claims` → Mappers tab
   - Click "Add mapper" → "By configuration"

   **Mapper 1: GovernsAI User ID**
   - Name: `governs-user-id`
   - Mapper Type: `User Attribute`
   - User Attribute: `governs_user_id`
   - Token Claim Name: `governs_user_id`
   - Claim JSON Type: `String`
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
   - Click "Save"

   **Mapper 2: Organization ID**
   - Name: `org-id`
   - Mapper Type: `User Attribute`
   - User Attribute: `org_id`
   - Token Claim Name: `org_id`
   - Claim JSON Type: `String`
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
   - Click "Save"

   **Mapper 3: Organization Slug**
   - Name: `org-slug`
   - Mapper Type: `User Attribute`
   - User Attribute: `org_slug`
   - Token Claim Name: `org_slug`
   - Claim JSON Type: `String`
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
   - Click "Save"

   **Mapper 4: Organization Role**
   - Name: `org-role`
   - Mapper Type: `User Attribute`
   - User Attribute: `org_role`
   - Token Claim Name: `org_role`
   - Claim JSON Type: `String`
   - Add to ID token: **ON**
   - Add to access token: **ON**
   - Add to userinfo: **ON**
   - Click "Save"

### 2. Dashboard Configuration

#### Environment Variables

Add these variables to your `.env.local` (development) or production environment:

```env
# Keycloak Configuration
KEYCLOAK_BASE_URL=https://auth.governsai.com
KEYCLOAK_REALM=governs-ai
KEYCLOAK_ADMIN_CLIENT_ID=admin-sync-client
KEYCLOAK_ADMIN_CLIENT_SECRET=your-admin-client-secret-from-step-4
```

#### Verify Integration

Run the test script to verify the integration:

```bash
cd apps/platform
npx tsx scripts/test-keycloak-sync-standalone.ts
```

Expected output:
```
🧪 Testing Keycloak User Sync Integration
========================================

Test 1: Creating user in Keycloak...
✅ User created successfully
   Keycloak User ID: abc123...

Test 2: Updating email verification status...
✅ Email verification updated successfully

Test 3: Updating org and role...
✅ Org/role updated successfully

Test 4: Deleting user from Keycloak...
✅ User deleted successfully

========================================
🎉 All tests completed!
```

### 3. Create Chatbot Clients

For each chatbot application that needs "Login with GovernsAI":

1. **Create Client**
   - Go to: Clients → Create client
   - **General Settings**:
     - Client ID: `your-chatbot-app-id`
     - Name: `Your Chatbot Name`
     - Click "Next"
   
   - **Capability config**:
     - ☑ Client authentication: **ON** (for backend apps)
     - ☐ Client authentication: **OFF** (for SPAs)
     - Authentication flow:
       - ☑ Standard flow: **ON**
       - ☑ Direct access grants: **OFF** (optional)
     - Click "Next"
   
   - **Login settings**:
     - Valid redirect URIs: `https://your-chatbot.com/auth/callback`
     - Valid post logout redirect URIs: `https://your-chatbot.com`
     - Web origins: `https://your-chatbot.com`
     - Click "Save"

2. **Assign Custom Scope**
   - Go to: Clients → `your-chatbot-app-id` → Client scopes tab
   - Click "Add client scope"
   - Select: `governs-claims`
   - Add as: **Default**
   - Click "Add"

3. **Get Client Credentials** (for backend apps)
   - Go to: Clients → `your-chatbot-app-id` → Credentials tab
   - Copy the "Client secret"
   - Provide to chatbot developer

## Integration Points

The dashboard automatically syncs users to Keycloak at these points:

| Event | API Route | Action |
|-------|-----------|--------|
| **User Signup** | `/api/auth/signup` | Create user in Keycloak with org context |
| **Email Verified** | `/api/auth/email/verify/consume` | Update `emailVerified=true` |
| **Join Organization** | `/api/orgs/join` | Update user's org context |
| **Role Changed** | `/api/orgs/[orgId]/users/[userId]` (PATCH) | Update `org_role` attribute |
| **User Removed** | `/api/orgs/[orgId]/users/[userId]` (DELETE) | Delete user from Keycloak |

All sync operations are:
- **Non-blocking**: Failures don't break user workflows
- **Asynchronous**: Use `.catch()` for error handling
- **Logged**: Errors are logged to console for monitoring
- **Idempotent**: Safe to retry multiple times

## OIDC Endpoints

### Discovery Document
```
https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration
```

### Authorization Endpoint
```
https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/auth
```

### Token Endpoint
```
https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/token
```

### UserInfo Endpoint
```
https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/userinfo
```

### Logout Endpoint
```
https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/logout
```

## Token Claims

Access tokens and ID tokens include these custom claims:

```json
{
  "sub": "keycloak-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "preferred_username": "user@example.com",
  
  // Custom GovernsAI claims
  "governs_user_id": "original-dashboard-user-id",
  "org_id": "organization-id",
  "org_slug": "organization-slug",
  "org_role": "ADMIN"
}
```

## Chatbot Integration Examples

### Python (FastAPI)

```python
from fastapi import FastAPI, Depends
from authlib.integrations.starlette_client import OAuth

app = FastAPI()

oauth = OAuth()
oauth.register(
    name='governsai',
    client_id='your-chatbot-client-id',
    client_secret='your-chatbot-client-secret',
    server_metadata_url='https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid profile email'}
)

@app.get('/login')
async def login(request: Request):
    redirect_uri = 'https://your-chatbot.com/auth/callback'
    return await oauth.governsai.authorize_redirect(request, redirect_uri)

@app.get('/auth/callback')
async def auth_callback(request: Request):
    token = await oauth.governsai.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    # Access custom claims
    governs_user_id = user_info.get('governs_user_id')
    org_id = user_info.get('org_id')
    org_slug = user_info.get('org_slug')
    org_role = user_info.get('org_role')
    
    # Use org_id and governs_user_id when calling GovernsAI APIs
    # ...
    
    return {'user': user_info}
```

### JavaScript (Next.js with NextAuth)

```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';

export default NextAuth({
  providers: [
    {
      id: 'governsai',
      name: 'GovernsAI',
      type: 'oauth',
      wellKnown: 'https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration',
      authorization: { params: { scope: 'openid profile email' } },
      clientId: process.env.GOVERNSAI_CLIENT_ID,
      clientSecret: process.env.GOVERNSAI_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          // Custom claims
          governsUserId: profile.governs_user_id,
          orgId: profile.org_id,
          orgSlug: profile.org_slug,
          orgRole: profile.org_role,
        };
      },
    },
  ],
  callbacks: {
    async session({ session, token }) {
      // Add custom claims to session
      session.user.governsUserId = token.governsUserId;
      session.user.orgId = token.orgId;
      session.user.orgSlug = token.orgSlug;
      session.user.orgRole = token.orgRole;
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.governsUserId = profile.governs_user_id;
        token.orgId = profile.org_id;
        token.orgSlug = profile.org_slug;
        token.orgRole = profile.org_role;
      }
      return token;
    },
  },
});
```

### React (SPA with PKCE)

```javascript
import { UserManager } from 'oidc-client-ts';

const userManager = new UserManager({
  authority: 'https://auth.governsai.com/realms/governs-ai',
  client_id: 'your-chatbot-client-id',
  redirect_uri: 'https://your-chatbot.com/auth/callback',
  response_type: 'code',
  scope: 'openid profile email',
  post_logout_redirect_uri: 'https://your-chatbot.com',
});

// Login
export async function login() {
  await userManager.signinRedirect();
}

// Handle callback
export async function handleCallback() {
  const user = await userManager.signinRedirectCallback();
  
  // Access custom claims
  const { governs_user_id, org_id, org_slug, org_role } = user.profile;
  
  return user;
}

// Get current user
export async function getUser() {
  return await userManager.getUser();
}
```

## Troubleshooting

### User Not Syncing to Keycloak

**Symptom**: User created in dashboard but not appearing in Keycloak

**Check**:
1. Verify environment variables are set correctly
2. Check application logs for error messages
3. Verify service account has correct permissions
4. Test with the test script: `npx tsx scripts/test-keycloak-sync.ts`

**Solution**:
```bash
# Check logs
tail -f /var/log/your-app.log | grep -i keycloak

# Verify permissions
# Go to Keycloak → Clients → admin-sync-client → Service account roles
# Ensure manage-users, view-users, query-users are assigned
```

### Custom Claims Not in Token

**Symptom**: Access token doesn't include `org_id`, `org_slug`, etc.

**Check**:
1. Verify `governs-claims` scope is assigned to the client
2. Check client scope is set as "Default", not "Optional"
3. Verify user attributes are populated in Keycloak

**Solution**:
```bash
# Check user attributes in Keycloak
# Users → Select user → Attributes tab
# Should see: governs_user_id, org_id, org_slug, org_role
```

### Authentication Fails with 401

**Symptom**: Service account authentication fails

**Check**:
1. Verify `KEYCLOAK_ADMIN_CLIENT_SECRET` matches the client secret in Keycloak
2. Ensure client has "Service accounts roles" enabled
3. Check Keycloak is accessible from your application

**Solution**:
```bash
# Test Keycloak connectivity
curl https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration

# Verify service account auth
curl -X POST https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/token \
  -d "grant_type=client_credentials" \
  -d "client_id=admin-sync-client" \
  -d "client_secret=your-secret"
```

### User Operations Fail with 403 Forbidden

**Symptom**: Authentication succeeds but user operations fail with 403 Forbidden

**Check**:
1. Verify service account has all required permissions
2. Check that realm-management roles are properly assigned
3. Ensure the client has "Service accounts roles" enabled

**Solution**:
1. Go to Keycloak Admin Console → Clients → `admin-sync-client` → Service account roles
2. Click "Assign role" → Filter by clients: `realm-management`
3. Assign these additional roles:
   - ☑ `manage-clients`
   - ☑ `view-clients`
   - ☑ `manage-realm`
   - ☑ `view-realm`
4. Click "Assign"
5. Test the integration again

## Security Considerations

1. **Service Account Credentials**
   - Store `KEYCLOAK_ADMIN_CLIENT_SECRET` securely
   - Never commit secrets to version control
   - Use environment variables or secret managers
   - Rotate credentials regularly

2. **User Passwords**
   - Users manage passwords in the dashboard, not Keycloak
   - Keycloak passwords are randomly generated and temporary
   - Users cannot login directly to Keycloak with password

3. **Token Validation**
   - Chatbot apps should validate tokens using Keycloak's public keys
   - Use the JWKS endpoint for key rotation support
   - Verify issuer, audience, and expiration claims

4. **Network Security**
   - Use HTTPS for all Keycloak communication
   - Restrict service account to necessary permissions only
   - Monitor Keycloak admin logs for suspicious activity

## Monitoring

### Key Metrics to Monitor

1. **Sync Success Rate**
   - Track successful vs failed sync operations
   - Alert on sync failure spikes

2. **Token Issuance**
   - Monitor OIDC token requests
   - Track login success/failure rates

3. **User Attributes**
   - Verify org context is populated correctly
   - Check for orphaned users (no org context)

### Logging

All sync operations log to the application console:

```
✅ Created Keycloak user: user@example.com
✅ Updated Keycloak user: user@example.com
✅ Updated email verification for Keycloak user: user@example.com
✅ Updated org for Keycloak user: user@example.com
✅ Deleted Keycloak user: user@example.com

❌ Failed to sync user to Keycloak: [error details]
⚠️  Keycloak user not found for email: user@example.com
```

## Additional Resources

- [Keycloak Admin REST API Documentation](https://www.keycloak.org/docs-api/latest/rest-api/)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [PKCE for Public Clients](https://oauth.net/2/pkce/)

## Support

For issues with the integration:
1. Check application logs for sync errors
2. Run the test script to verify connectivity
3. Review Keycloak admin console for user status
4. Contact the GovernsAI team for assistance

