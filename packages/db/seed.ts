import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test organization
  const org = await prisma.org.create({
    data: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  });

  console.log('✅ Created organization:', { id: org.id, name: org.name, slug: org.slug });

  // Create a test user
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });

  console.log('✅ Created user:', { id: user.id, email: user.email });

  // Create user membership
  const membership = await prisma.orgMembership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created membership:', { userId: user.id, orgId: org.id, role: membership.role });

  // Create an API key for the user
  const apiKey = await prisma.aPIKey.create({
    data: {
      key: 'gov_key_73a082a0cba066729f73a8240fff5ab80ab14afb90731c131a432163851eb36e',
      name: 'Demo API Key',
      userId: user.id,
      orgId: org.id, // This should be the CUID, not the slug
      scopes: ['read', 'write'],
      env: 'dev',
    },
  });

  console.log('✅ Created API key:', { 
    key: apiKey.key.substring(0, 20) + '...', 
    userId: apiKey.userId, 
    orgId: apiKey.orgId 
  });

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
          action: 'allow',
          allow_pii: {
            'PII:location': 'pass_through',
          },
        },
        'weather.forecast': {
          direction: 'egress',
          action: 'allow',
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
    const tool = await prisma.toolConfig.create({
      data: toolData,
    });
    console.log('✅ Created tool config:', { toolName: tool.toolName, category: tool.category });
  }

  console.log('🎉 Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`- Organization: ${org.name} (${org.slug}) - ID: ${org.id}`);
  console.log(`- User: ${user.email} - ID: ${user.id}`);
  console.log(`- API Key: ${apiKey.key.substring(0, 20)}...`);
  console.log(`- Policy: ${policy.name} - ID: ${policy.id}`);
  console.log(`- Tools: ${tools.length} tool configurations created`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
