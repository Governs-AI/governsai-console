'use client';

import React from 'react';
import { Badge } from '@governs-ai/ui';
import { UserRole, getRoleDisplayName, getRoleColor, getRoleDescription } from '@/lib/role-utils';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function RoleBadge({ role, size = 'md', showIcon = false }: RoleBadgeProps) {
  const displayName = getRoleDisplayName(role);
  const colorClasses = getRoleColor(role);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      variant="secondary" 
      className={`${colorClasses} ${sizeClasses[size]} font-medium`}
    >
      {showIcon && (
        <span className="mr-1">
          {role === 'OWNER' && '👑'}
          {role === 'ADMIN' && '🛡️'}
          {role === 'DEVELOPER' && '⚙️'}
          {role === 'VIEWER' && '👁️'}
        </span>
      )}
      {displayName}
    </Badge>
  );
}

interface RoleInfoProps {
  role: UserRole;
  showDescription?: boolean;
}

export function RoleInfo({ role, showDescription = false }: RoleInfoProps) {
  const description = getRoleDescription(role);
  
  return (
    <div className="space-y-1">
      <RoleBadge role={role} size="md" showIcon />
      {showDescription && (
        <p className="text-xs text-muted-foreground max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}
