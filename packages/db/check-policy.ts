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
  
  console.log('✅ Found API key:');
  console.log('  Org:', keyRecord.org.name, `(${keyRecord.org.slug})`);
  console.log('  User:', keyRecord.user.email);
  console.log('  OrgId:', keyRecord.orgId);
  
  // Find policies for this org
  const policies = await prisma.policy.findMany({
    where: { orgId: keyRecord.orgId, isActive: true }
  });
  
  console.log('\n📋 Policies for this org:', policies.length);
  policies.forEach(p => {
    console.log('\nPolicy:', p.name);
    console.log('  ID:', p.id);
    console.log('  Priority:', p.priority);
    console.log('  Tool Access:', JSON.stringify(p.toolAccess, null, 2));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
