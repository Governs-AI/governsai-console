import 'server-only';

// Network access utilities for WebSocket connections
export function getClientIP(request: Request): string {
  // Trust your LB/Cloudflare; configure a trusted proxy list in prod
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  // Priority: CF-Connecting-IP > X-Real-IP > X-Forwarded-For first entry
  const ip = cfConnectingIP || realIP || forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';
  
  // Normalize IPv6-mapped IPv4: ::ffff:203.0.113.10 -> 203.0.113.10
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  
  return ip;
}

export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

export function isValidIPv6(ip: string): boolean {
  // Basic IPv6 validation - in production, use a proper library like ipaddr.js
  const parts = ip.split(':');
  if (parts.length < 3 || parts.length > 8) return false;
  
  return parts.every(part => {
    if (part === '') return true; // Empty parts are valid in IPv6 compression
    return /^[0-9a-fA-F]{1,4}$/.test(part);
  });
}

export function ipInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  
  if (isNaN(prefix)) return false;
  
  // IPv4 CIDR matching
  if (isValidIPv4(ip) && isValidIPv4(network)) {
    const ipNum = ipv4ToNumber(ip);
    const networkNum = ipv4ToNumber(network);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    
    return (ipNum & mask) === (networkNum & mask);
  }
  
  // IPv6 CIDR matching - simplified version
  // In production, use a proper library like ipaddr.js
  if (isValidIPv6(ip) && isValidIPv6(network)) {
    // For now, only support exact matches for IPv6
    return ip === network;
  }
  
  return false;
}

function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function matchIP(ip: string, allowList: string[]): boolean {
  return allowList.some(entry => {
    if (entry.includes('/')) {
      return ipInCIDR(ip, entry);
    } else {
      return ip === entry;
    }
  });
}

export function matchOrigin(origin: string, allowList: string[]): boolean {
  if (!origin) return false;
  
  const normalizedOrigin = origin.toLowerCase();
  
  return allowList.some(rule => {
    const normalizedRule = rule.toLowerCase();
    
    // Support wildcard subdomains: https://*.example.com
    if (normalizedRule.includes('*')) {
      const pattern = normalizedRule.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(normalizedOrigin);
    }
    
    // Exact match
    return normalizedOrigin === normalizedRule;
  });
}

export function validateNetworkRule(kind: string, value: string): { valid: boolean; error?: string } {
  switch (kind) {
    case 'origin':
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          return { valid: false, error: 'Origin must use http or https protocol' };
        }
        return { valid: true };
      } catch {
        // Check for wildcard patterns
        if (value.includes('*.')) {
          const withoutWildcard = value.replace('*.', 'test.');
          try {
            new URL(withoutWildcard);
            return { valid: true };
          } catch {
            return { valid: false, error: 'Invalid origin format' };
          }
        }
        return { valid: false, error: 'Invalid origin format' };
      }
      
    case 'ip':
      if (isValidIPv4(value) || isValidIPv6(value)) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid IP address format' };
      
    case 'cidr':
      const [network, prefixStr] = value.split('/');
      const prefix = parseInt(prefixStr, 10);
      
      if (isNaN(prefix)) {
        return { valid: false, error: 'Invalid CIDR prefix' };
      }
      
      if (isValidIPv4(network)) {
        if (prefix < 0 || prefix > 32) {
          return { valid: false, error: 'IPv4 CIDR prefix must be between 0 and 32' };
        }
        return { valid: true };
      }
      
      if (isValidIPv6(network)) {
        if (prefix < 0 || prefix > 128) {
          return { valid: false, error: 'IPv6 CIDR prefix must be between 0 and 128' };
        }
        return { valid: true };
      }
      
      return { valid: false, error: 'Invalid network address in CIDR' };
      
    default:
      return { valid: false, error: 'Invalid rule kind. Must be origin, ip, or cidr' };
  }
}

export interface NetworkAccessContext {
  ip: string;
  origin?: string;
  userAgent?: string;
}

export function checkNetworkAccess(
  context: NetworkAccessContext,
  orgRules: Array<{ kind: string; value: string; isActive: boolean; expiresAt?: Date | null }>,
  keyRules: string[] = []
): { allowed: boolean; reason?: string; matchedRule?: string } {
  const now = new Date();
  
  // Filter active and non-expired org rules
  const activeOrgRules = orgRules.filter(rule => 
    rule.isActive && (!rule.expiresAt || rule.expiresAt > now)
  );
  
  const originRules = activeOrgRules.filter(r => r.kind === 'origin').map(r => r.value);
  const ipRules = activeOrgRules.filter(r => r.kind !== 'origin').map(r => r.value);
  
  // Combine org IP rules with per-key overrides
  const allIPRules = [...ipRules, ...keyRules];
  
  // Check IP access (required for all connections)
  const ipAllowed = matchIP(context.ip, allIPRules);
  if (!ipAllowed) {
    return { 
      allowed: false, 
      reason: `IP ${context.ip} not in allowlist`,
    };
  }
  
  // Check origin access (required for browser connections)
  if (context.origin) {
    const originAllowed = matchOrigin(context.origin, originRules);
    if (!originAllowed) {
      return { 
        allowed: false, 
        reason: `Origin ${context.origin} not in allowlist`,
      };
    }
    return { allowed: true, matchedRule: `origin:${context.origin}` };
  }
  
  // Agent connection (no origin) - IP check passed
  return { allowed: true, matchedRule: `ip:${context.ip}` };
}
