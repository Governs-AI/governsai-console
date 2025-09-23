import { PrismaClient } from '../generated/index.js';

const prisma = new PrismaClient();

export async function getFullUserProfileByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      apiKeys: true,
      usageRecords: true,
      budgets: true,
      auditLogs: true,
    },
  });
}

export async function getFullUserProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      apiKeys: true,
      usageRecords: true,
      budgets: true,
      auditLogs: true,
    },
  });
}

export async function checkProfileCompletion(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      apiKeys: true,
      usageRecords: true,
      budgets: true,
      auditLogs: true,
    },
  });

  if (!user) return false;

  // Check if user has API keys configured
  if (user.apiKeys && user.apiKeys.length > 0) return true;

  // Check if user has usage records
  if (user.usageRecords && user.usageRecords.length > 0) return true;

  // Check if user has budgets configured
  if (user.budgets && user.budgets.length > 0) return true;

  return false;
}

export async function updateProfileCompletion(userId: string, isCompleted: boolean = true) {
  return prisma.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() },
  });
}

export async function getUserWithProfileCompletion(userId: string) {
  const user = await getFullUserProfile(userId);
  if (!user) return null;

  const isCompleted = await checkProfileCompletion(userId);
  
  return {
    ...user,
    isProfileCompleted: isCompleted,
  };
}
