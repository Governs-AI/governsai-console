import { createHash } from 'crypto';
import { prisma } from '@governs-ai/db';
import jwt from 'jsonwebtoken';

/** Keys are stored as SHA-256 hashes (see apps/platform/lib/api-keys.ts). */
export function hashApiKey(rawKey) {
  return createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

function isExpired(record) {
  return Boolean(record.expiresAt && new Date(record.expiresAt) < new Date());
}

/**
 * Authentication Service for WebSocket connections
 * 
 * Handles API key and session token authentication
 * for WebSocket connections to the GovernsAI service.
 */
export class AuthService {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = process.env.JWT_SECRET;
  }

  /**
   * Authenticate using API key and organization
   */
  async authenticateApiKey(apiKey, orgSlug) {
    try {
      console.log('🔍 Authenticating API key:', { apiKey: apiKey?.slice(0, 10) + '...', orgSlug });
      
      if (!apiKey) {
        console.log('❌ Missing API key');
        return { success: false, error: 'Missing API key' };
      }

      // Find API key with organization
      const apiKeyRecord = await prisma.aPIKey.findFirst({
        where: {
          keyHash: hashApiKey(apiKey),
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          org: {
            select: {
              id: true,
              slug: true,
              name: true
            }
          }
        }
      });

      console.log('🔍 API key lookup result:', {
        found: !!apiKeyRecord,
        keyPrefix: apiKeyRecord?.keyPrefix,
        isActive: apiKeyRecord?.isActive,
        userId: apiKeyRecord?.userId,
        orgId: apiKeyRecord?.orgId
      });

      if (!apiKeyRecord || isExpired(apiKeyRecord)) {
        console.log('❌ API key not found in database');
        return { success: false, error: 'Invalid API key' };
      }

      if (apiKeyRecord.org.slug !== orgSlug) {
        return { success: false, error: 'API key does not belong to specified organization' };
      }

      // Update last used timestamp
      await prisma.aPIKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsed: new Date() }
      });

      return {
        success: true,
        userId: apiKeyRecord.userId,
        orgId: apiKeyRecord.orgId,
        apiKey,
        apiKeyId: apiKeyRecord.id,
        userEmail: apiKeyRecord.user.email,
        userName: apiKeyRecord.user.name,
        orgSlug: apiKeyRecord.org.slug,
        orgName: apiKeyRecord.org.name,
        scopes: apiKeyRecord.scopes || []
      };

    } catch (error) {
      console.error('API key authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Authenticate using only API key (for WebSocket connections)
   */
  async authenticateApiKeyOnly(apiKey) {
    try {
      console.log('🔍 Authenticating API key only:', { apiKey: apiKey?.slice(0, 10) + '...' });
      
      if (!apiKey) {
        console.log('❌ Missing API key');
        return { success: false, error: 'Missing API key' };
      }

      // Find API key
      const apiKeyRecord = await prisma.aPIKey.findFirst({
        where: {
          keyHash: hashApiKey(apiKey),
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          org: {
            select: {
              id: true,
              slug: true,
              name: true
            }
          }
        }
      });

      console.log('🔍 API key lookup result:', {
        found: !!apiKeyRecord,
        keyPrefix: apiKeyRecord?.keyPrefix,
        isActive: apiKeyRecord?.isActive,
        userId: apiKeyRecord?.userId,
        orgId: apiKeyRecord?.orgId
      });

      if (!apiKeyRecord || isExpired(apiKeyRecord)) {
        console.log('❌ API key not found in database');
        return { success: false, error: 'Invalid API key' };
      }

      // Update last used timestamp
      await prisma.aPIKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsed: new Date() }
      });

      return {
        success: true,
        userId: apiKeyRecord.userId,
        orgId: apiKeyRecord.orgId,
        apiKey,
        apiKeyId: apiKeyRecord.id,
        userEmail: apiKeyRecord.user.email,
        userName: apiKeyRecord.user.name,
        orgSlug: apiKeyRecord.org.slug,
        orgName: apiKeyRecord.org.name,
        scopes: apiKeyRecord.scopes || []
      };

    } catch (error) {
      console.error('API key authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Get user's organization by userId
   */
  async getUserOrg(userId) {
    try {
      console.log('🔍 Fetching org for userId:', userId);
      
      if (!userId) {
        console.log('❌ Missing userId');
        return null;
      }

      // Find user's organization membership
      const membership = await prisma.orgMembership.findFirst({
        where: {
          userId: userId
        },
        include: {
          org: {
            select: {
              id: true,
              slug: true,
              name: true
            }
          }
        }
      });

      console.log('🔍 User org lookup result:', {
        found: !!membership,
        orgId: membership?.orgId,
        orgSlug: membership?.org?.slug
      });

      if (!membership) {
        console.log('❌ No organization found for userId');
        return null;
      }

      return {
        orgId: membership.orgId,
        orgSlug: membership.org.slug,
        orgName: membership.org.name
      };

    } catch (error) {
      console.error('Error fetching user org:', error);
      return null;
    }
  }

  /**
   * Authenticate using session token
   */
  async authenticateSession(sessionId, token) {
    try {
      if (!sessionId || !token) {
        return { success: false, error: 'Missing session ID or token' };
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, this.jwtSecret);
      } catch (jwtError) {
        return { success: false, error: 'Invalid session token' };
      }

      // Get user and organization info
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          memberships: {
            include: {
              org: {
                select: {
                  id: true,
                  slug: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Find the organization from the token
      const orgMembership = user.memberships.find(m => m.orgId === decoded.orgId);
      if (!orgMembership) {
        return { success: false, error: 'User not member of organization' };
      }

      return {
        success: true,
        userId: user.id,
        orgId: orgMembership.orgId,
        apiKey: null, // No API key for session auth
        userEmail: user.email,
        userName: user.name,
        orgSlug: orgMembership.org.slug,
        orgName: orgMembership.org.name,
        scopes: ['dashboard:read', 'dashboard:write'] // Default dashboard scopes
      };

    } catch (error) {
      console.error('Session authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Verify API key permissions for specific actions
   */
  async verifyPermissions(apiKey, requiredScopes) {
    try {
      const apiKeyRecord = await prisma.aPIKey.findUnique({
        where: { keyHash: hashApiKey(apiKey) },
        select: { scopes: true, isActive: true, expiresAt: true }
      });

      if (!apiKeyRecord || !apiKeyRecord.isActive || isExpired(apiKeyRecord)) {
        return { success: false, error: 'Invalid API key' };
      }

      const keyScopes = apiKeyRecord.scopes || [];
      const hasPermission = requiredScopes.every(scope => keyScopes.includes(scope));

      if (!hasPermission) {
        return { 
          success: false, 
          error: `Missing required permissions: ${requiredScopes.join(', ')}` 
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Permission verification error:', error);
      return { success: false, error: 'Permission verification failed' };
    }
  }

  /**
   * Generate allowed channels based on authentication context
   */
  generateAllowedChannels(authContext) {
    const channels = [];

    // Organization-level channels
    if (authContext.orgId) {
      channels.push(`org:${authContext.orgId}:decisions`);
      channels.push(`org:${authContext.orgId}:notifications`);
    }

    // User-level channels
    if (authContext.userId) {
      channels.push(`user:${authContext.userId}:notifications`);
      channels.push(`user:${authContext.userId}:usage`);
    }

    // API key-level channels
    // Named by key id, so the key itself never appears in channel names or logs.
    if (authContext.apiKeyId) {
      channels.push(`key:${authContext.apiKeyId}:usage`);
    }

    return channels;
  }

  /**
   * Check if user has access to organization
   */
  async checkOrgAccess(userId, orgId) {
    try {
      const membership = await prisma.orgMembership.findFirst({
        where: {
          userId,
          orgId
        }
      });

      return membership !== null;
    } catch (error) {
      console.error('Organization access check error:', error);
      return false;
    }
  }

  /**
   * Get user organizations
   */
  async getUserOrganizations(userId) {
    try {
      const memberships = await prisma.orgMembership.findMany({
        where: { userId },
        include: {
          org: {
            select: {
              id: true,
              slug: true,
              name: true
            }
          }
        }
      });

      return memberships.map(m => ({
        id: m.org.id,
        slug: m.org.slug,
        name: m.org.name,
        role: m.role
      }));
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      return [];
    }
  }

  /**
   * Create audit log entry for authentication events
   */
  async logAuthEvent(userId, orgId, action, details = {}) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          orgId,
          action,
          resource: 'websocket_auth',
          details: {
            ...details,
            timestamp: new Date().toISOString(),
            service: 'websocket-service'
          }
        }
      });
    } catch (error) {
      console.error('Error logging auth event:', error);
      // Don't throw - logging failures shouldn't break auth
    }
  }

  /**
   * Validate API key format
   */
  validateApiKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, error: 'API key must be a string' };
    }

    if (!apiKey.startsWith('gai_')) {
      return { valid: false, error: 'API key must start with "gai_"' };
    }

    if (apiKey.length < 20) {
      return { valid: false, error: 'API key too short' };
    }

    return { valid: true };
  }

  /**
   * Validate organization slug format
   */
  validateOrgSlugFormat(slug) {
    if (!slug || typeof slug !== 'string') {
      return { valid: false, error: 'Organization slug must be a string' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return { valid: false, error: 'Organization slug contains invalid characters' };
    }

    if (slug.length < 2 || slug.length > 50) {
      return { valid: false, error: 'Organization slug must be 2-50 characters' };
    }

    return { valid: true };
  }

  /**
   * Get authentication statistics
   */
  async getAuthStats() {
    try {
      const [activeApiKeys, totalUsers, totalOrgs] = await Promise.all([
        prisma.aPIKey.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.org.count()
      ]);

      return {
        activeApiKeys,
        totalUsers,
        totalOrgs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching auth stats:', error);
      return null;
    }
  }

  /**
   * Cleanup expired sessions and tokens
   */
  async cleanup() {
    try {
      // This would be implemented based on your session management strategy
      // For now, we'll just return a placeholder
      console.log('🧹 Auth cleanup completed');
      return { cleaned: 0 };
    } catch (error) {
      console.error('Auth cleanup error:', error);
      return { cleaned: 0 };
    }
  }
}
