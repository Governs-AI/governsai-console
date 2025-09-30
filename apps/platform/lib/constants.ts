export function getValidAppUrl(): string {
  // Check for Vercel deployment URL first
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Check for custom domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Fallback to localhost for development
  const port = process.env.PORT || '3002';
  return `http://localhost:${port}`;
}
