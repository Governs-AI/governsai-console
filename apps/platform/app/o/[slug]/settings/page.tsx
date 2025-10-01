'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Badge
} from '@governs-ai/ui';
import {
  Users,
  Shield,
  Key,
  Settings as SettingsIcon,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  status: 'configured' | 'partial' | 'not-configured';
  lastUpdated?: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.slug as string;

  const [sections, setSections] = useState<SettingsSection[]>([
    {
      id: 'members',
      title: 'Team Members',
      description: 'Manage organization members, roles, and permissions',
      icon: Users,
      href: `/o/${orgSlug}/settings/members`,
      status: 'configured',
      lastUpdated: '2 hours ago'
    },
    {
      id: 'passkeys',
      title: 'Passkeys',
      description: 'Configure passwordless authentication with passkeys',
      icon: Key,
      href: `/o/${orgSlug}/settings/passkeys`,
      status: 'partial',
      lastUpdated: '1 day ago'
    },
    {
      id: 'mfa',
      title: 'Multi-Factor Authentication',
      description: 'Set up TOTP and additional security measures',
      icon: Shield,
      href: `/o/${orgSlug}/settings/mfa`,
      status: 'not-configured',
      lastUpdated: undefined
    },
    {
      id: 'general',
      title: 'General Settings',
      description: 'Organization preferences and basic configuration',
      icon: SettingsIcon,
      href: `/o/${orgSlug}/settings/general`,
      status: 'not-configured',
      lastUpdated: undefined
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'not-configured':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge variant="default" className="bg-green-100 text-green-800">Configured</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'not-configured':
        return <Badge variant="outline" className="text-gray-500">Not Configured</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500">Unknown</Badge>;
    }
  };

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization's configuration and security settings
            </p>
          </div>
        </div>

        {/* Settings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Configured</p>
                  <p className="text-2xl font-bold text-green-600">
                    {sections.filter(s => s.status === 'configured').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Partial</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {sections.filter(s => s.status === 'partial').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Not Configured</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {sections.filter(s => s.status === 'not-configured').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Configuration Sections</h2>
          
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(section.href)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Icon className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {section.title}
                          </h3>
                          {getStatusIcon(section.status)}
                        </div>
                        <p className="text-muted-foreground text-sm mb-2">
                          {section.description}
                        </p>
                        {section.lastUpdated && (
                          <p className="text-xs text-muted-foreground">
                            Last updated {section.lastUpdated}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(section.status)}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 justify-start"
                onClick={() => router.push(`/o/${orgSlug}/settings/members`)}
              >
                <div className="text-left">
                  <div className="font-medium">Invite Team Member</div>
                  <div className="text-sm text-muted-foreground">Add new users to your organization</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 justify-start"
                onClick={() => router.push(`/o/${orgSlug}/settings/passkeys`)}
              >
                <div className="text-left">
                  <div className="font-medium">Set Up Passkeys</div>
                  <div className="text-sm text-muted-foreground">Enable passwordless authentication</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}
