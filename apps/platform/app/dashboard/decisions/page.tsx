import { Suspense } from 'react';
import DecisionsClient from './decisions-client';

export default function DecisionsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading decisions...</div>}>
      <DecisionsClient />
    </Suspense>
  );
}
