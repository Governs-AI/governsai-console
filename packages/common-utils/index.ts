/**
 * Common utilities for GovernsAI monorepo
 * 
 * This package provides shared utilities that can be used across all
 * applications in the GovernsAI ecosystem.
 */

// Navigation utilities
export {
    getPlatformUrl,
    getDocsUrl,
    getLandingUrl,
    getAuthUrl,
    getEntryPointUrl,
    navigationUrls,
    getAllUrls,
    validateNavigationEnvironment,
    type AppType,
    type NavigationConfig,
} from './src/navigation'; 