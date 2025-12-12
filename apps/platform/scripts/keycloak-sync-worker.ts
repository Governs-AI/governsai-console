#!/usr/bin/env tsx

import { processKeycloakSyncJobs } from '../lib/keycloak-sync';

async function main() {
  const result = await processKeycloakSyncJobs({ limit: 50 });
  console.log('Keycloak sync worker result:', result);
}

main().catch((err) => {
  console.error('Keycloak sync worker failed:', err);
  process.exit(1);
});
