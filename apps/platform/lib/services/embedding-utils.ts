import { getDatabaseVectorDimension } from '../config/rag-config';

export function normalizeEmbeddingDimensions(
  values: number[],
  targetDim: number = getDatabaseVectorDimension()
): number[] {
  if (values.length === targetDim) return values;
  if (values.length > targetDim) return values.slice(0, targetDim);
  const padded = values.slice();
  while (padded.length < targetDim) padded.push(0);
  return padded;
}

export function toVectorString(values: number[]): string {
  return `[${values.join(',')}]`;
}
