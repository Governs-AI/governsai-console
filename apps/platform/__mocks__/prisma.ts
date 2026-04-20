/**
 * Manual mock for @governs-ai/db — replaces every Prisma model method
 * with a jest.fn() so tests can configure return values without a real DB.
 */

export const prisma = {
  org: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
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
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  budgetLimit: {
    findFirst: jest.fn(),
  },
  usageRecord: {
    aggregate: jest.fn(),
  },
  purchaseRecord: {
    aggregate: jest.fn(),
  },
  decision: {
    create: jest.fn(),
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
  contextMemory: {
    findFirst: jest.fn(),
  },
};
