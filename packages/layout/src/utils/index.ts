/**
 * Utility function to merge CSS classes with proper conflict resolution
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Utility function to format user display name
 */
export function formatUserName(name: string, email: string): string {
  if (name && name.trim()) {
    return name.trim();
  }
  
  // Fallback to email username
  const emailUsername = email.split('@')[0];
  return emailUsername ? emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1) : 'User';
}

/**
 * Utility function to get user initials for avatar
 */
export function getUserInitials(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]?.[0] || ''}${parts[parts.length - 1]?.[0] || ''}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  }
  
  // Fallback to email
  return email[0]?.toUpperCase() || 'U';
}

/**
 * Utility function to check if a URL is external
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Utility function to get active navigation item
 */
export function getActiveNavigationItem(
  items: any[],
  pathname: string
): any | null {
  for (const item of items) {
    if (item.href === pathname) {
      return item;
    }
    if (item.children) {
      const activeChild = getActiveNavigationItem(item.children, pathname);
      if (activeChild) {
        return activeChild;
      }
    }
  }
  return null;
}

/**
 * Utility function to generate breadcrumbs from pathname
 */
export function generateBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ label: 'Home', href: '/' }];
  
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    breadcrumbs.push({ label, href: currentPath });
  });
  
  return breadcrumbs;
}

/**
 * Utility function to debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Utility function to throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Utility function to check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Utility function to scroll element into view smoothly
 */
export function scrollIntoView(element: HTMLElement, options?: ScrollIntoViewOptions): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
    ...options,
  });
} 