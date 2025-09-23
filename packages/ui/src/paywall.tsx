'use client';

import React from 'react';
import { useFeatureAccess } from '@governs-ai/billing/react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { 
  Crown, 
  Lock, 
  Sparkles, 
  Zap, 
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

interface PaywallProps {
  feature: string;
  variant?: 'blur' | 'overlay' | 'inline';
  children: React.ReactNode;
  className?: string;
  onUpgrade?: () => void;
  showFeatureList?: boolean;
  customMessage?: string;
}

export function Paywall({ 
  feature, 
  variant = 'overlay',
  children, 
  className = '',
  onUpgrade,
  showFeatureList = true,
  customMessage
}: PaywallProps) {
  const { hasAccess, isLoading, tier } = useFeatureAccess(feature);

  // If user has access, show the content
  if (hasAccess) {
    return <>{children}</>;
  }

  // If loading, show a placeholder
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-32 bg-muted rounded-lg"></div>
      </div>
    );
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/pricing';
    }
  };

  // Blur variant - blurs content and shows overlay
  if (variant === 'blur') {
    return (
      <div className={`relative ${className}`}>
        <div className="blur-sm pointer-events-none">
          {children}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">
              {customMessage || `This feature requires a Pro subscription`}
            </p>
            <Button onClick={handleUpgrade}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Overlay variant - shows content with overlay on top
  if (variant === 'overlay') {
    return (
      <div className={`relative ${className}`}>
        {children}
        
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">Unlock Premium</h3>
            <p className="text-muted-foreground mb-4">
              {customMessage || `Upgrade to Pro to access this feature and unlock unlimited potential`}
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Unlimited access</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Priority support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Advanced analytics</span>
              </div>
            </div>
            
            <Button onClick={handleUpgrade} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant - replaces content with upgrade CTA
  return (
    <Card className={`border-dashed ${className}`}>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-primary" />
        </div>
        
        <CardTitle className="text-xl">Premium Feature</CardTitle>
        <CardDescription>
          {customMessage || `This feature is available exclusively for Pro subscribers`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        {showFeatureList && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Unlimited interviews</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Advanced AI analysis</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Priority support</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={handleUpgrade} className="flex-1 sm:flex-none">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
            <Zap className="w-4 h-4 mr-2" />
            View Plans
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            Current: {tier === 'free' ? 'Free' : 'Pro'}
          </Badge>
          <span>•</span>
          <span>Cancel anytime</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Feature-specific paywalls for common use cases
export function InterviewPaywall({ 
  children, 
  variant = 'overlay',
  className = '',
  onUpgrade
}: {
  children: React.ReactNode;
  variant?: 'blur' | 'overlay' | 'inline';
  className?: string;
  onUpgrade?: () => void;
}) {
  return (
    <Paywall 
      feature="interviews_per_week" 
      variant={variant}
      className={className}
      onUpgrade={onUpgrade}
      customMessage="You've reached your weekly interview limit. Upgrade to Pro for unlimited interviews."
    >
      {children}
    </Paywall>
  );
}

export function VideoPaywall({ 
  children, 
  variant = 'overlay',
  className = '',
  onUpgrade
}: {
  children: React.ReactNode;
  variant?: 'blur' | 'overlay' | 'inline';
  className?: string;
  onUpgrade?: () => void;
}) {
  return (
    <Paywall 
      feature="video_minutes_per_week" 
      variant={variant}
      className={className}
      onUpgrade={onUpgrade}
      customMessage="You've reached your weekly video minutes limit. Upgrade to Pro for 4x more video time."
    >
      {children}
    </Paywall>
  );
}

export function ResumeExportPaywall({ 
  children, 
  variant = 'overlay',
  className = '',
  onUpgrade
}: {
  children: React.ReactNode;
  variant?: 'blur' | 'overlay' | 'inline';
  className?: string;
  onUpgrade?: () => void;
}) {
  return (
    <Paywall 
      feature="resume_exports_per_month" 
      variant={variant}
      className={className}
      onUpgrade={onUpgrade}
      customMessage="You've reached your monthly resume export limit. Upgrade to Pro for unlimited exports."
    >
      {children}
    </Paywall>
  );
}

export function AutoApplyPaywall({ 
  children, 
  variant = 'overlay',
  className = '',
  onUpgrade
}: {
  children: React.ReactNode;
  variant?: 'blur' | 'overlay' | 'inline';
  className?: string;
  onUpgrade?: () => void;
}) {
  return (
    <Paywall 
      feature="auto_apply_per_month" 
      variant={variant}
      className={className}
      onUpgrade={onUpgrade}
      customMessage="You've reached your monthly auto-apply limit. Upgrade to Pro for 100 auto-applies per month."
    >
      {children}
    </Paywall>
  );
}
