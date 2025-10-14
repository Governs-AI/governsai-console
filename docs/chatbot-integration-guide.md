# GovernsAI Chatbot Integration Guide

## Overview

This guide shows how to integrate "Login with GovernsAI" into your chatbot application. This enables your chatbot to:

- **Authenticate users** using GovernsAI credentials
- **Access user context** (organization, role, permissions)
- **Call GovernsAI APIs** with proper authorization
- **Provide personalized experiences** based on user's organization

## Quick Start

### 1. Get Your Client Credentials

Contact the GovernsAI team to get your chatbot client credentials:

- **Client ID**: `your-chatbot-client-id`
- **Client Secret**: `your-chatbot-client-secret` (for backend apps)
- **Redirect URI**: `https://your-chatbot.com/auth/callback`

### 2. OIDC Configuration

**Discovery Document**: `https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration`

**Key Endpoints**:
- Authorization: `https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/auth`
- Token: `https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/token`
- UserInfo: `https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/userinfo`

### 3. Token Claims

When users authenticate, you'll receive tokens with these custom claims:

```json
{
  "sub": "keycloak-user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true,
  
  // GovernsAI custom claims
  "governs_user_id": "original-dashboard-user-id",
  "org_id": "organization-id", 
  "org_slug": "organization-slug",
  "org_role": "ADMIN"
}
```

## Integration Examples

### Python (FastAPI/Flask)

```python
from fastapi import FastAPI, Request, Depends
from authlib.integrations.starlette_client import OAuth
import httpx

app = FastAPI()

# Configure OAuth
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
    """Redirect to GovernsAI login"""
    redirect_uri = 'https://your-chatbot.com/auth/callback'
    return await oauth.governsai.authorize_redirect(request, redirect_uri)

@app.get('/auth/callback')
async def auth_callback(request: Request):
    """Handle OAuth callback"""
    token = await oauth.governsai.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    # Extract GovernsAI context
    governs_user_id = user_info.get('governs_user_id')
    org_id = user_info.get('org_id')
    org_slug = user_info.get('org_slug')
    org_role = user_info.get('org_role')
    
    # Store in session or database
    # ... your session management code ...
    
    return {
        'message': 'Login successful',
        'user': {
            'email': user_info.get('email'),
            'name': user_info.get('name'),
            'org_slug': org_slug,
            'org_role': org_role
        }
    }

@app.get('/chat')
async def chat_endpoint(request: Request):
    """Your chatbot endpoint with user context"""
    # Get user from session
    user = get_user_from_session(request)
    
    if not user:
        return {'error': 'Please login first'}
    
    # Use user context for personalized responses
    return {
        'message': f'Hello {user["name"]} from {user["org_slug"]}!',
        'user_context': {
            'org_id': user['org_id'],
            'org_role': user['org_role']
        }
    }
```

### Node.js (Express)

```javascript
const express = require('express');
const { Issuer, Strategy } = require('openid-client');

const app = express();

// Configure OIDC client
let client;
(async () => {
  const issuer = await Issuer.discover('https://auth.governsai.com/realms/governs-ai');
  client = new issuer.Client({
    client_id: 'your-chatbot-client-id',
    client_secret: 'your-chatbot-client-secret',
    redirect_uris: ['https://your-chatbot.com/auth/callback'],
    response_types: ['code'],
  });
})();

// Login endpoint
app.get('/login', (req, res) => {
  const authUrl = client.authorizationUrl({
    scope: 'openid profile email',
    response_type: 'code',
  });
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback('https://your-chatbot.com/auth/callback', params);
    
    // Get user info with custom claims
    const userInfo = await client.userinfo(tokenSet.access_token);
    
    // Extract GovernsAI context
    const userContext = {
      email: userInfo.email,
      name: userInfo.name,
      governs_user_id: userInfo.governs_user_id,
      org_id: userInfo.org_id,
      org_slug: userInfo.org_slug,
      org_role: userInfo.org_role
    };
    
    // Store in session
    req.session.user = userContext;
    
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Chatbot endpoint
app.post('/chat', (req, res) => {
  const user = req.session.user;
  
  if (!user) {
    return res.status(401).json({ error: 'Please login first' });
  }
  
  // Use user context for personalized responses
  const response = {
    message: `Hello ${user.name} from ${user.org_slug}!`,
    user_context: {
      org_id: user.org_id,
      org_role: user.org_role
    }
  };
  
  res.json(response);
});
```

### React (SPA)

```javascript
import { UserManager } from 'oidc-client-ts';

// Configure OIDC client
const userManager = new UserManager({
  authority: 'https://auth.governsai.com/realms/governs-ai',
  client_id: 'your-chatbot-client-id',
  redirect_uri: 'https://your-chatbot.com/auth/callback',
  response_type: 'code',
  scope: 'openid profile email',
  post_logout_redirect_uri: 'https://your-chatbot.com',
});

// Login function
export async function login() {
  await userManager.signinRedirect();
}

// Handle callback
export async function handleCallback() {
  const user = await userManager.signinRedirectCallback();
  
  // Extract GovernsAI context
  const userContext = {
    email: user.profile.email,
    name: user.profile.name,
    governs_user_id: user.profile.governs_user_id,
    org_id: user.profile.org_id,
    org_slug: user.profile.org_slug,
    org_role: user.profile.org_role
  };
  
  return userContext;
}

// Get current user
export async function getUser() {
  return await userManager.getUser();
}

// Chatbot component
function Chatbot() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    getUser().then(user => {
      if (user) {
        setUser({
          email: user.profile.email,
          name: user.profile.name,
          org_slug: user.profile.org_slug,
          org_role: user.profile.org_role
        });
      }
    });
  }, []);
  
  const handleLogin = () => {
    login();
  };
  
  const handleChat = async () => {
    if (!user) {
      alert('Please login first');
      return;
    }
    
    // Send message with user context
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`
      },
      body: JSON.stringify({
        message,
        user_context: {
          org_id: user.org_id,
          org_role: user.org_role
        }
      })
    });
    
    const data = await response.json();
    console.log('Chat response:', data);
  };
  
  if (!user) {
    return (
      <div>
        <h1>Welcome to Chatbot</h1>
        <button onClick={handleLogin}>Login with GovernsAI</button>
      </div>
    );
  }
  
  return (
    <div>
      <h1>Welcome {user.name} from {user.org_slug}!</h1>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleChat}>Send</button>
    </div>
  );
}
```

## Using GovernsAI APIs

Once authenticated, you can call GovernsAI APIs with the user's access token:

```python
import httpx

async def call_governsai_api(access_token: str, org_id: str):
    """Call GovernsAI API with user context"""
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Example: Get user's policies
    response = await httpx.get(
        f'https://api.governsai.com/v1/orgs/{org_id}/policies',
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f'API call failed: {response.status_code}')

# In your chatbot endpoint
@app.post('/chat')
async def chat(request: Request):
    user = get_user_from_session(request)
    
    # Call GovernsAI API with user context
    try:
        policies = await call_governsai_api(
            user['access_token'], 
            user['org_id']
        )
        
        # Use policies to inform chatbot responses
        return {
            'message': 'Here are your organization policies...',
            'policies': policies
        }
    except Exception as e:
        return {'error': f'Failed to fetch policies: {str(e)}'}
```

## Setup Checklist

### For Chatbot Developers

1. **Get Client Credentials**
   - [ ] Contact GovernsAI team for client ID and secret
   - [ ] Provide your redirect URI: `https://your-chatbot.com/auth/callback`

2. **Configure OIDC Client**
   - [ ] Set up OIDC client in your preferred language
   - [ ] Configure discovery document: `https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration`
   - [ ] Set scope to include: `openid profile email`

3. **Implement Authentication Flow**
   - [ ] Create login endpoint that redirects to GovernsAI
   - [ ] Handle OAuth callback to exchange code for tokens
   - [ ] Extract custom claims: `governs_user_id`, `org_id`, `org_slug`, `org_role`

4. **Use User Context**
   - [ ] Store user context in session/database
   - [ ] Use `org_id` and `org_role` for personalized responses
   - [ ] Call GovernsAI APIs with access token when needed

5. **Test Integration**
   - [ ] Test login flow end-to-end
   - [ ] Verify custom claims are present in tokens
   - [ ] Test API calls with user context

### For GovernsAI Team

1. **Create Chatbot Client**
   - [ ] Go to Keycloak Admin Console
   - [ ] Create new client with chatbot's redirect URI
   - [ ] Assign `governs-claims` scope for custom claims
   - [ ] Provide client ID and secret to chatbot team

2. **Verify Integration**
   - [ ] Test that users can authenticate
   - [ ] Verify custom claims are included in tokens
   - [ ] Monitor for any authentication issues

## Troubleshooting

### Common Issues

**1. "Invalid redirect URI" error**
- Ensure redirect URI in Keycloak matches exactly: `https://your-chatbot.com/auth/callback`
- Check for trailing slashes and protocol (http vs https)

**2. Custom claims missing from tokens**
- Verify `governs-claims` scope is assigned to the client
- Check that user has org context in Keycloak attributes

**3. "Client authentication failed"**
- Verify client ID and secret are correct
- Check that client has proper permissions in Keycloak

**4. Token validation fails**
- Ensure you're using the correct JWKS endpoint for token validation
- Check token expiration and issuer claims

### Debug Steps

1. **Check OIDC Discovery**
   ```bash
   curl https://auth.governsai.com/realms/governs-ai/.well-known/openid-configuration
   ```

2. **Test Token Exchange**
   ```bash
   curl -X POST https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/token \
     -d "grant_type=authorization_code" \
     -d "client_id=your-client-id" \
     -d "client_secret=your-client-secret" \
     -d "code=authorization-code" \
     -d "redirect_uri=https://your-chatbot.com/auth/callback"
   ```

3. **Verify User Info**
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://auth.governsai.com/realms/governs-ai/protocol/openid-connect/userinfo
   ```

## Security Best Practices

1. **Token Storage**
   - Store access tokens securely (encrypted at rest)
   - Implement proper token refresh logic
   - Never expose tokens in client-side code

2. **Session Management**
   - Use secure session cookies
   - Implement proper logout functionality
   - Set appropriate session timeouts

3. **API Security**
   - Always validate tokens before making API calls
   - Use HTTPS for all communications
   - Implement rate limiting on authentication endpoints

4. **User Context Validation**
   - Always verify user's org context before making API calls
   - Implement proper error handling for invalid contexts
   - Log authentication events for monitoring

## Support

For integration support:

1. **Documentation**: Check this guide and the main Keycloak integration docs
2. **Testing**: Use the test script to verify your setup
3. **Contact**: Reach out to the GovernsAI team for assistance

## Next Steps

After successful integration:

1. **Personalize Chatbot**: Use user's org context to provide relevant responses
2. **API Integration**: Connect to GovernsAI APIs for policy enforcement
3. **Monitoring**: Set up logging and monitoring for authentication events
4. **Scaling**: Consider implementing user session management for high-traffic scenarios
