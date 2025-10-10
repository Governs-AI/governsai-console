# Keycloak Environment Variables

Add these environment variables to your `.env.local` or production environment configuration:

```env
# Keycloak Configuration
# Base URL of your Keycloak instance
KEYCLOAK_BASE_URL="https://auth.governsai.com"

# Keycloak realm name
KEYCLOAK_REALM="governs-ai"

# Admin API Service Account (for syncing users)
# Create a client with service account enabled and manage-users permissions
KEYCLOAK_ADMIN_CLIENT_ID="admin-sync-client"
KEYCLOAK_ADMIN_CLIENT_SECRET="your-admin-client-secret"
```

## Setup Instructions

1. **Create Admin Service Account in Keycloak:**
   - Go to Keycloak Admin Console → Clients → Create client
   - Client ID: `admin-sync-client`
   - Enable "Client authentication"
   - Enable "Service accounts roles"
   - Save the client

2. **Grant Permissions:**
   - Go to the client's "Service account roles" tab
   - Assign role → Filter by clients: `realm-management`
   - Select these roles:
     - ☑ `manage-users`
     - ☑ `view-users` 
     - ☑ `query-users`
     - ☑ `manage-clients` (needed for user operations)
     - ☑ `view-clients` (needed for user operations)
     - ☑ `manage-realm` (needed for user operations)
     - ☑ `view-realm` (needed for user operations)
   - Click "Assign"

3. **Get Client Secret:**
   - Go to client's "Credentials" tab
   - Copy the "Client secret"
   - Add to your environment variables

4. **Configure in Production:**
   - Add these variables to your hosting platform (Vercel, Railway, etc.)
   - Ensure the base URL uses HTTPS in production

