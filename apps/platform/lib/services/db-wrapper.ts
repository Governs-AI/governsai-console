/**
 * Database wrapper with explicit typing for new context memory models
 * This is a temporary solution until TypeScript recognizes the new Prisma models
 */

import { prisma } from '@governs-ai/db';

// Explicitly type the new models to avoid TypeScript errors
export const db = {
  ...prisma,
  contextMemory: prisma.contextMemory as any,
  conversation: prisma.conversation as any,
  contextAccessLog: prisma.contextAccessLog as any,
  document: prisma.document as any,
  documentChunk: prisma.documentChunk as any,
};
