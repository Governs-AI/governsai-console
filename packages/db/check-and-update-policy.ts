import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apiKey = 'gov_key_2620d1e880a302249ff7e10cf1fb1c31058f58b61fee9eeaa024b76aa9aff74c';

  // Find the API key
  const keyRecord = await prisma.aPIKey.findFirst({
    where: { key: apiKey },
    include: { org: true, user: true }
  });

  if (!keyRecord) {
    console.log('❌ API key not found');
    return;
  }

  console.log('✅ API Key Info:');
  console.log('  Org:', keyRecord.org.name, `(${keyRecord.org.slug})`);
  console.log('  User:', keyRecord.user.email);
  console.log('  OrgId:', keyRecord.orgId);

  // Find policies for this org
  const policies = await prisma.policy.findMany({
    where: { orgId: keyRecord.orgId, isActive: true }
  });

  console.log('\n📋 Active Policies:', policies.length);

  if (policies.length === 0) {
    console.log('\n⚠️  No active policies found for this org!');
    console.log('Creating a default policy with weather requiring confirmation...\n');

    const newPolicy = await prisma.policy.create({
      data: {
        orgId: keyRecord.orgId,
        userId: keyRecord.userId,
        name: 'Default Policy',
        description: 'Default governance policy with weather confirmation',
        version: 'v1',
        defaults: {
          ingress: { action: 'redact' },
          egress: { action: 'redact' },
        },
        toolAccess: {
          'weather.current': {
            direction: 'egress',
            action: 'confirm',
            allow_pii: { 'PII:location': 'pass_through' },
          },
          'weather.forecast': {
            direction: 'egress',
            action: 'confirm',
            allow_pii: { 'PII:location': 'pass_through' },
          },
          'web.search': {
            direction: 'egress',
            action: 'redact',
            allow_pii: {},
          },
        },
        denyTools: ['python.exec', 'bash.exec', 'code.exec', 'shell.exec'],
        allowTools: [],
        networkScopes: ['net.'],
        networkTools: ['web.', 'email.', 'calendar.'],
        onError: 'block',
        isActive: true,
        priority: 0,
      },
    });

    console.log('✅ Created policy:', newPolicy.name, '(ID:', newPolicy.id + ')');
    console.log('   Weather tools now require confirmation!');
  } else {
    // Check and update existing policies
    for (const policy of policies) {
      console.log('\n📄 Policy:', policy.name, '(ID:', policy.id + ')');
      console.log('   Priority:', policy.priority);

      const toolAccess = policy.toolAccess as any;
      console.log('   Current tool_access:');
      console.log('     weather.current:', toolAccess['weather.current']?.action || 'not set');
      console.log('     weather.forecast:', toolAccess['weather.forecast']?.action || 'not set');

      // Update if weather is not set to confirm
      if (
        toolAccess['weather.current']?.action !== 'confirm' ||
        toolAccess['weather.forecast']?.action !== 'confirm'
      ) {
        console.log('\n   ⚠️  Weather tools not set to "confirm", updating...');

        const updatedToolAccess = {
          ...toolAccess,
          'weather.current': {
            direction: 'egress',
            action: 'confirm',
            allow_pii: { 'PII:location': 'pass_through' },
          },
          'weather.forecast': {
            direction: 'egress',
            action: 'confirm',
            allow_pii: { 'PII:location': 'pass_through' },
          },
        };

        await prisma.policy.update({
          where: { id: policy.id },
          data: { toolAccess: updatedToolAccess },
        });

        console.log('   ✅ Updated policy! Weather tools now require confirmation.');
      } else {
        console.log('   ✅ Policy already configured correctly!');
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
