/**
 * Manual mock for @governs-ai/db — replaces every Prisma model method
 * with a jest.fn() so tests can configure return values without a real DB.
 */

export const prisma = {
  aPIKey: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  orgMembership: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  org: {
    findUnique: jest.fn(),
  },
  verificationToken: {
    count: jest.fn(),
  },
  budgetLimit: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  budgetAlert: {
    findMany: jest.fn(),
  },
  usageRecord: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  purchaseRecord: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  decision: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  usageRecord_: jest.fn(),
  mfaTotp: {
    findUnique: jest.fn(),
  },
  passkey: {
    count: jest.fn(),
  },
  webhookIdempotencyKey: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  policy: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  contextMemory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  complianceReport: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
