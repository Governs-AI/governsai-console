'use client';

import React from 'react';
import { useQuota } from '@governs-ai/billing/client';
import { Button } from './button';
import { Badge } from './badge';
import { Progress } from './progress';
import { 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Zap,
  Info,
  Crown
} from 'lucide-react';

interface QuotaPillProps {
  feature: string;
  variant?: 'default' | 'compact' | 'detailed';
  showUpgradeCTA?: boolean;
  className?: string;
  onUpgrade?: () => void;
}

export function QuotaPill({ 
  feature, 
  variant = 'default',
  showUpgradeCTA = true,
  className = '',
  onUpgrade
}: QuotaPillProps) {
  const { quota, isLoading, error } = useQuota(feature);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-muted rounded-full w-24"></div>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <Badge variant="outline" className={`text-muted-foreground ${className}`}>
        <Info className="w-3 h-3 mr-1" />
        Usage unavailable
      </Badge>
    );
  }

  const { used, limit, remaining, tier, isUnlimited, percentageUsed } = quota;
  const isNearLimit = percentageUsed >= 80;
  const isAtLimit = percentageUsed >= 100;

  // Default variant
  if (variant === 'default') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}
          className="flex items-center gap-1"
        >
          {isAtLimit ? (
            <AlertCircle className="w-3 h-3" />
          ) : isNearLimit ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <CheckCircle className="w-3 h-3" />
          )}
          {used}/{isUnlimited ? '∞' : limit}
        </Badge>
        
        {showUpgradeCTA && tier === 'free' && (isNearLimit || isAtLimit) && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 px-2 text-xs"
            onClick={onUpgrade}
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Badge 
          variant={isAtLimit ? "destructive" : "outline"}
          className="text-xs"
        >
          {used}/{isUnlimited ? '∞' : limit}
        </Badge>
        
        {tier === 'free' && isNearLimit && (
          <Zap className="w-3 h-3 text-amber-500" />
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium capitalize">
          {feature.replace(/_/g, ' ')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {used} of {isUnlimited ? 'unlimited' : limit}
          </span>
          {tier === 'free' && (
            <Badge variant="outline" className="text-xs">
              Free
            </Badge>
          )}
          {tier === 'pro' && (
            <Badge variant="secondary" className="text-xs">
              <Crown className="w-2 h-2 mr-1" />
              Pro
            </Badge>
          )}
        </div>
      </div>
      
      <Progress 
        value={Math.min(percentageUsed, 100)} 
        className="h-2"
      />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {remaining > 0 ? `${remaining} remaining` : 'Limit reached'}
        </span>
        
        {showUpgradeCTA && tier === 'free' && (isNearLimit || isAtLimit) && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-6 px-2 text-xs"
            onClick={onUpgrade}
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade to Pro
          </Button>
        )}
      </div>
    </div>
  );
}

// Feature-specific quota pills for common use cases
export function InterviewQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="interviews_per_week" className={className} />;
}

export function VideoQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="video_minutes_per_week" className={className} />;
}

export function ResumeExportQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="resume_exports_per_month" className={className} />;
}

export function AutoApplyQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="auto_apply_per_month" className={className} />;
}

export function JobMatchesQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="job_matches_per_day" className={className} />;
}

export function StoredResumesQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="stored_resumes" className={className} />;
}

export function SavedJobsQuotaPill({ className = '' }: { className?: string }) {
  return <QuotaPill feature="saved_jobs" className={className} />;
}
