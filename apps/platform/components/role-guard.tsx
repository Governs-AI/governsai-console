'use client';

import React from 'react';
import { useUser } from '@/lib/user-context';
import { UserRole, hasPermission } from '@/lib/role-utils';
import { Shield, AlertCircle } from 'lucide-react';
import { Button } from '@governs-ai/ui';
import { useRouter } from 'next/navigation';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: keyof import('@/lib/role-utils').RolePermissions;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

/**
 * Role-based access control component
 * Wraps content that should only be visible to users with specific roles or permissions
 */
export function RoleGuard({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  showAccessDenied = true,
}: RoleGuardProps) {
  const { activeOrg, loading } = useUser();
  const router = useRouter();

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no active org, deny access
  if (!activeOrg) {
    return fallback || (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Organization Access</h3>
        <p className="text-muted-foreground mb-4">
          You need to be a member of an organization to access this feature.
        </p>
        <Button onClick={() => router.push('/auth/login')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const userRole = activeOrg.role as UserRole;

  // Check role-based access
  if (requiredRole) {
    const roleHierarchy = ['VIEWER', 'DEVELOPER', 'ADMIN', 'OWNER'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    if (userRoleIndex < requiredRoleIndex) {
      return fallback || (
        showAccessDenied ? (
          <div className="text-center p-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">
              You need {requiredRole.toLowerCase()} privileges or higher to access this feature.
            </p>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        ) : null
      );
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    if (!hasPermission(userRole, requiredPermission)) {
      return fallback || (
        showAccessDenied ? (
          <div className="text-center p-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this feature.
            </p>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        ) : null
      );
    }
  }

  // User has access, render children
  return <>{children}</>;
}

/**
 * Hook to check if user has a specific role or permission
 */
export function useRoleCheck() {
  const { activeOrg, loading } = useUser();

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!activeOrg || loading) return false;
    const userRole = activeOrg.role as UserRole;
    const roleHierarchy = ['VIEWER', 'DEVELOPER', 'ADMIN', 'OWNER'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    return userRoleIndex >= requiredRoleIndex;
  };

  const hasPermission = (permission: keyof import('@/lib/role-utils').RolePermissions): boolean => {
    if (!activeOrg || loading) return false;
    const userRole = activeOrg.role as UserRole;
    return hasPermission(userRole, permission);
  };

  const canAccessAdmin = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN'].includes(activeOrg.role as UserRole);
  };

  const canManageUsers = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN'].includes(activeOrg.role as UserRole);
  };

  const canManageSettings = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN'].includes(activeOrg.role as UserRole);
  };

  const canManageTools = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN', 'DEVELOPER'].includes(activeOrg.role as UserRole);
  };

  const canManagePolicies = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN', 'DEVELOPER'].includes(activeOrg.role as UserRole);
  };

  const canViewSpend = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'].includes(activeOrg.role as UserRole);
  };

  const canManageKeys = (): boolean => {
    if (!activeOrg || loading) return false;
    return ['OWNER', 'ADMIN', 'DEVELOPER'].includes(activeOrg.role as UserRole);
  };

  return {
    userRole: activeOrg?.role as UserRole,
    hasRole,
    hasPermission,
    canAccessAdmin,
    canManageUsers,
    canManageSettings,
    canManageTools,
    canManagePolicies,
    canViewSpend,
    canManageKeys,
    loading,
  };
}
