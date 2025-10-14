import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create or get test organization
  const org = await prisma.org.upsert({
    where: { name: 'Demo Organization' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  });

  console.log('✅ Created organization:', { id: org.id, name: org.name, slug: org.slug });

  // Create or get test user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });

  console.log('✅ Created user:', { id: user.id, email: user.email });

  // Create or get user membership
  const membership = await prisma.orgMembership.upsert({
    where: { 
      orgId_userId: {
        orgId: org.id,
        userId: user.id,
      }
    },
    update: {},
    create: {
      userId: user.id,
      orgId: org.id,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created membership:', { userId: user.id, orgId: org.id, role: membership.role });

  // Note: API keys should be created through the UI, not in seed scripts
  // This ensures proper security and user control over API key creation
  console.log('ℹ️  API keys should be created through the dashboard UI for security');

  // Create a default policy
  const policy = await prisma.policy.create({
    data: {
      orgId: org.id, // This should be the CUID, not the slug
      userId: user.id,
      name: 'Default Policy',
      description: 'Default policy for demo organization',
      version: 'v1',
      defaults: {
        ingress: { action: 'redact' },
        egress: { action: 'redact' },
      },
      toolAccess: {
        'weather.current': {
          direction: 'egress',
          action: 'confirm',
          allow_pii: {
            'PII:location': 'pass_through',
          },
        },
        'weather.forecast': {
          direction: 'egress',
          action: 'confirm',
          allow_pii: {
            'PII:location': 'pass_through',
          },
        },
        'web.search': {
          direction: 'egress',
          action: 'redact',
          allow_pii: {},
        },
        'web.scrape': {
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

  console.log('✅ Created policy:', { id: policy.id, name: policy.name, orgId: policy.orgId });

  // Create some tool configurations
  const tools = [
    {
      toolName: 'weather.current',
      displayName: 'Current Weather',
      description: 'Get current weather information',
      category: 'data',
      riskLevel: 'low',
      scope: 'net.external',
      direction: 'both',
      metadata: { requires_location: true },
      requiresApproval: false,
    },
    {
      toolName: 'weather.forecast',
      displayName: 'Weather Forecast',
      description: 'Get weather forecast',
      category: 'data',
      riskLevel: 'low',
      scope: 'net.external',
      direction: 'both',
      metadata: { requires_location: true },
      requiresApproval: false,
    },
    {
      toolName: 'web.search',
      displayName: 'Web Search',
      description: 'Search the web',
      category: 'web',
      riskLevel: 'medium',
      scope: 'net.external',
      direction: 'egress',
      metadata: { search_engines: ['google', 'bing'] },
      requiresApproval: false,
    },
    {
      toolName: 'web.scrape',
      displayName: 'Web Scraping',
      description: 'Scrape web content',
      category: 'web',
      riskLevel: 'high',
      scope: 'net.external',
      direction: 'egress',
      metadata: { respects_robots_txt: true },
      requiresApproval: true,
    },
  ];

  for (const toolData of tools) {
    const tool = await prisma.toolConfig.upsert({
      where: { toolName: toolData.toolName },
      update: toolData,
      create: toolData,
    });
    console.log('✅ Created/updated tool config:', { toolName: tool.toolName, category: tool.category });
  }

  console.log('🎉 Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`- Organization: ${org.name} (${org.slug}) - ID: ${org.id}`);
  console.log(`- User: ${user.email} - ID: ${user.id}`);
  console.log(`- Policy: ${policy.name} - ID: ${policy.id}`);
  console.log(`- Tools: ${tools.length} tool configurations created`);
  console.log(`- API Keys: Create through the dashboard UI for security`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
