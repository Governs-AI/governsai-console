/**
 * Role-based access control utilities
 */

export type UserRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface RolePermissions {
    canManageUsers: boolean;
    canManageSettings: boolean;
    canManageTools: boolean;
    canManagePolicies: boolean;
    canViewSpend: boolean;
    canManageKeys: boolean;
    canViewAdmin: boolean;
    canInviteUsers: boolean;
    canRemoveUsers: boolean;
    canChangeRoles: boolean;
}

/**
 * Get permissions for a user role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
    switch (role) {
        case 'OWNER':
            return {
                canManageUsers: true,
                canManageSettings: true,
                canManageTools: true,
                canManagePolicies: true,
                canViewSpend: true,
                canManageKeys: true,
                canViewAdmin: true,
                canInviteUsers: true,
                canRemoveUsers: true,
                canChangeRoles: true,
            };

        case 'ADMIN':
            return {
                canManageUsers: true,
                canManageSettings: true,
                canManageTools: true,
                canManagePolicies: true,
                canViewSpend: true,
                canManageKeys: true,
                canViewAdmin: true,
                canInviteUsers: true,
                canRemoveUsers: true,
                canChangeRoles: false, // Cannot change owner roles
            };

        case 'DEVELOPER':
            return {
                canManageUsers: false,
                canManageSettings: false,
                canManageTools: true,
                canManagePolicies: true,
                canViewSpend: true,
                canManageKeys: true,
                canViewAdmin: false,
                canInviteUsers: false,
                canRemoveUsers: false,
                canChangeRoles: false,
            };

        case 'VIEWER':
            return {
                canManageUsers: false,
                canManageSettings: false,
                canManageTools: false,
                canManagePolicies: false,
                canViewSpend: true,
                canManageKeys: false,
                canViewAdmin: false,
                canInviteUsers: false,
                canRemoveUsers: false,
                canChangeRoles: false,
            };

        default:
            return {
                canManageUsers: false,
                canManageSettings: false,
                canManageTools: false,
                canManagePolicies: false,
                canViewSpend: false,
                canManageKeys: false,
                canViewAdmin: false,
                canInviteUsers: false,
                canRemoveUsers: false,
                canChangeRoles: false,
            };
    }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
    const permissions = getRolePermissions(role);
    return permissions[permission];
}

/**
 * Check if a user can access admin features
 */
export function canAccessAdmin(role: UserRole): boolean {
    return ['OWNER', 'ADMIN'].includes(role);
}

/**
 * Check if a user can manage other users
 */
export function canManageUsers(role: UserRole): boolean {
    return ['OWNER', 'ADMIN'].includes(role);
}

/**
 * Check if a user can manage settings
 */
export function canManageSettings(role: UserRole): boolean {
    return ['OWNER', 'ADMIN'].includes(role);
}

/**
 * Check if a user can manage tools
 */
export function canManageTools(role: UserRole): boolean {
    return ['OWNER', 'ADMIN', 'DEVELOPER'].includes(role);
}

/**
 * Check if a user can manage policies
 */
export function canManagePolicies(role: UserRole): boolean {
    return ['OWNER', 'ADMIN', 'DEVELOPER'].includes(role);
}

/**
 * Check if a user can view spend data
 */
export function canViewSpend(role: UserRole): boolean {
    return ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'].includes(role);
}

/**
 * Check if a user can manage keys
 */
export function canManageKeys(role: UserRole): boolean {
    return ['OWNER', 'ADMIN', 'DEVELOPER'].includes(role);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
    switch (role) {
        case 'OWNER':
            return 'Owner';
        case 'ADMIN':
            return 'Administrator';
        case 'DEVELOPER':
            return 'Developer';
        case 'VIEWER':
            return 'Viewer';
        default:
            return 'Unknown';
    }
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
    switch (role) {
        case 'OWNER':
            return 'Full access to all features and settings. Can manage all users and organization settings.';
        case 'ADMIN':
            return 'Can manage users, settings, and most features. Cannot change owner roles.';
        case 'DEVELOPER':
            return 'Can manage tools, policies, and view spend data. Cannot manage users or settings.';
        case 'VIEWER':
            return 'Read-only access to view data and reports. Cannot make changes.';
        default:
            return 'No access';
    }
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: UserRole): string {
    switch (role) {
        case 'OWNER':
            return 'text-purple-600 bg-purple-100';
        case 'ADMIN':
            return 'text-red-600 bg-red-100';
        case 'DEVELOPER':
            return 'text-blue-600 bg-blue-100';
        case 'VIEWER':
            return 'text-gray-600 bg-gray-100';
        default:
            return 'text-gray-600 bg-gray-100';
    }
}
