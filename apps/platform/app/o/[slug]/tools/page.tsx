'use client';
import { Suspense } from 'react';
import { ToolsClient } from '@/components/tools-client';
import PlatformShell from '@/components/platform-shell';
import { useParams } from 'next/navigation';

export default function ToolsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;

  return (
    <PlatformShell orgSlug={orgSlug}>
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tools...</p>
        </div>
      </div>
    }>
      <ToolsClient orgSlug={orgSlug} />
    </Suspense>
    </PlatformShell>
  );

}