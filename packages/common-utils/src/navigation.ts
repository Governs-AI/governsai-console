/**
 * Navigation utility functions for GovernsAI monorepo
 * 
 * These functions provide centralized URL management for all applications
 * in the GovernsAI ecosystem. They use environment variables to ensure
 * proper URLs across different environments (development, staging, production).
 */

/**
 * Get the platform application URL
 * @returns The platform URL from environment variables
 */
export const getPlatformUrl = (): string => {
    return process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3002";
};

/**
 * Get the documentation application URL
 * @returns The documentation URL from environment variables
 */
export const getDocsUrl = (): string => {
    return process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:3001";
};

/**
 * Get the landing page application URL
 * @returns The landing page URL from environment variables
 */
export const getLandingUrl = (): string => {
    return process.env.NEXT_PUBLIC_LANDING_URL || "http://localhost:3000";
};

/**
 * Get the authentication service URL
 * @returns The authentication service URL from environment variables
 */
export const getAuthUrl = (): string => {
    return process.env.NEXT_PUBLIC_AUTH_URL || "/auth";
};

/**
 * Get the main entry point URL
 * @returns The entry point URL from environment variables
 */
export const getEntryPointUrl = (): string => {
    return process.env.NEXT_PUBLIC_ENTRY_POINT_URL || "/";
};

/**
 * Navigation URL builder with path support
 * Builds complete URLs for specific routes within applications
 */
export const navigationUrls = {
    // Platform routes
    platform: {
        home: () => getPlatformUrl(),
        dashboard: () => `${getPlatformUrl()}/dashboard`,
        usage: () => `${getPlatformUrl()}/usage`,
        budgets: () => `${getPlatformUrl()}/budgets`,
        policies: () => `${getPlatformUrl()}/policies`,
        audit: () => `${getPlatformUrl()}/audit`,
        apiKeys: () => `${getPlatformUrl()}/api-keys`,
        organizations: () => `${getPlatformUrl()}/organizations`,
        profile: () => `${getPlatformUrl()}/profile`,
        settings: () => `${getPlatformUrl()}/settings`,
    },

    // Documentation routes
    docs: {
        home: () => getDocsUrl(),
        gettingStarted: () => `${getDocsUrl()}/getting-started`,
        apiReference: () => `${getDocsUrl()}/api-reference`,
        guides: () => `${getDocsUrl()}/guides`,
        security: () => `${getDocsUrl()}/security`,
        billing: () => `${getDocsUrl()}/billing`,
        support: () => `${getDocsUrl()}/support`,
    },

    // Landing page routes
    landing: {
        home: () => getLandingUrl(),
        pricing: () => `${getLandingUrl()}/pricing`,
        contact: () => `${getLandingUrl()}/contact`,
        about: () => `${getLandingUrl()}/about`,
    },

    // Authentication routes
    auth: {
        home: () => getAuthUrl(),
        signin: () => `${getAuthUrl()}/signin`,
        signup: () => `${getAuthUrl()}/signup`,
        signout: () => `${getAuthUrl()}/signout`,
        help: () => `${getAuthUrl()}/help`,
    },

    // Entry point routes
    entryPoint: {
        home: () => getEntryPointUrl(),
        landing: () => `${getEntryPointUrl()}/landing-page`,
    },
};

/**
 * Type definitions for navigation
 */
export type AppType = 'platform' | 'docs' | 'landing' | 'auth' | 'entryPoint';

export interface NavigationConfig {
    id: string;
    href: string;
    external: boolean;
    app?: AppType;
}

/**
 * Get all available navigation URLs as a flat object
 * Useful for quick access to any URL in the system
 */
export const getAllUrls = () => ({
    // Base URLs
    platformUrl: getPlatformUrl(),
    docsUrl: getDocsUrl(),
    landingUrl: getLandingUrl(),
    authUrl: getAuthUrl(),
    entryPointUrl: getEntryPointUrl(),

    // Platform URLs
    platformHome: navigationUrls.platform.home(),
    platformDashboard: navigationUrls.platform.dashboard(),
    platformUsage: navigationUrls.platform.usage(),
    platformBudgets: navigationUrls.platform.budgets(),
    platformPolicies: navigationUrls.platform.policies(),
    platformAudit: navigationUrls.platform.audit(),
    platformApiKeys: navigationUrls.platform.apiKeys(),
    platformOrganizations: navigationUrls.platform.organizations(),

    // Documentation URLs
    docsHome: navigationUrls.docs.home(),
    docsGettingStarted: navigationUrls.docs.gettingStarted(),
    docsApiReference: navigationUrls.docs.apiReference(),
    docsGuides: navigationUrls.docs.guides(),
    docsSecurity: navigationUrls.docs.security(),
    docsBilling: navigationUrls.docs.billing(),
    docsSupport: navigationUrls.docs.support(),

    // Landing URLs
    landingHome: navigationUrls.landing.home(),
    landingPricing: navigationUrls.landing.pricing(),
    landingContact: navigationUrls.landing.contact(),
    landingAbout: navigationUrls.landing.about(),

    // Auth URLs
    authHome: navigationUrls.auth.home(),
    authSignin: navigationUrls.auth.signin(),
    authSignup: navigationUrls.auth.signup(),
    authSignout: navigationUrls.auth.signout(),

    // Entry Point URLs
    entryPointHome: navigationUrls.entryPoint.home(),
    entryPointLanding: navigationUrls.entryPoint.landing(),
});

/**
 * Validate that all required environment variables are set
 * Call this function during app initialization to catch missing env vars early
 */
export const validateNavigationEnvironment = (): void => {
    // No-op in dev/build to avoid throwing. Apps can validate at runtime if needed.
};