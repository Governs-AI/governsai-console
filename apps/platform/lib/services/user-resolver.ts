/**
 * User Resolution Service
 *
 * Handles external user ID mapping and auto-provisioning for external integrations.
 * When an external app provides their own user ID, this service:
 * 1. Checks if a user exists with that external ID
 * 2. If not, creates a new user in our system
 * 3. Returns the internal user ID for use in all operations
 */

import { prisma } from '../db';
import { Prisma } from '@prisma/client';

export interface ResolveUserParams {
  externalUserId: string;
  externalSource: string;
  orgId: string;
  email?: string;
  name?: string;
}

export interface ResolvedUser {
  internalUserId: string;
  created: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    externalId: string | null;
    externalSource: string | null;
  };
}

export class UserResolverService {
  /**
   * Resolve external user ID to internal user ID
   * Auto-creates user if they don't exist
   */
  async resolveExternalUser(params: ResolveUserParams): Promise<ResolvedUser> {
    const { externalUserId, externalSource, orgId, email, name } = params;

    // Build the external ID format: source:id
    // This allows multiple external systems to use the same user IDs without collision
    const externalId = `${externalSource}:${externalUserId}`;

    // Try to find existing user
    const existingUser = await prisma.user.findUnique({
      where: { externalId },
      select: {
        id: true,
        email: true,
        name: true,
        externalId: true,
        externalSource: true,
      },
    });

    if (existingUser) {
      return {
        internalUserId: existingUser.id,
        created: false,
        user: existingUser,
      };
    }

    // User doesn't exist - create new user
    // Generate email if not provided
    const userEmail = email || `${externalUserId}@external.${externalSource}.generated`;
    const userName = name || `External User ${externalUserId}`;

    try {
      const newUser = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          externalId,
          externalSource,
          emailVerified: null, // External users don't have verified emails initially
        },
        select: {
          id: true,
          email: true,
          name: true,
          externalId: true,
          externalSource: true,
        },
      });

      // Create org membership for the new user
      await prisma.orgMembership.create({
        data: {
          userId: newUser.id,
          orgId,
          role: 'VIEWER', // Default role for external users
        },
      });

      return {
        internalUserId: newUser.id,
        created: true,
        user: newUser,
      };
    } catch (error) {
      // Handle race condition: another request might have created the user
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation - user was created by another request
          // Retry the lookup
          const user = await prisma.user.findUnique({
            where: { externalId },
            select: {
              id: true,
              email: true,
              name: true,
              externalId: true,
              externalSource: true,
            },
          });

          if (user) {
            return {
              internalUserId: user.id,
              created: false,
              user,
            };
          }
        }
      }

      // Re-throw if it's not a race condition
      throw error;
    }
  }

  /**
   * Batch resolve multiple external user IDs
   * Useful for bulk operations
   */
  async resolveExternalUsers(
    users: Array<Omit<ResolveUserParams, 'orgId'> & { orgId?: string }>,
    defaultOrgId: string
  ): Promise<ResolvedUser[]> {
    const results: ResolvedUser[] = [];

    for (const user of users) {
      const resolved = await this.resolveExternalUser({
        ...user,
        orgId: user.orgId || defaultOrgId,
      });
      results.push(resolved);
    }

    return results;
  }

  /**
   * Get user by internal ID
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        externalId: true,
        externalSource: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get user by external ID
   */
  async getUserByExternalId(externalUserId: string, externalSource: string) {
    const externalId = `${externalSource}:${externalUserId}`;
    return prisma.user.findUnique({
      where: { externalId },
      select: {
        id: true,
        email: true,
        name: true,
        externalId: true,
        externalSource: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update external user metadata
   */
  async updateExternalUser(
    externalUserId: string,
    externalSource: string,
    data: { email?: string; name?: string }
  ) {
    const externalId = `${externalSource}:${externalUserId}`;
    return prisma.user.update({
      where: { externalId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        externalId: true,
        externalSource: true,
      },
    });
  }
}

// Export singleton instance
export const userResolverService = new UserResolverService();
