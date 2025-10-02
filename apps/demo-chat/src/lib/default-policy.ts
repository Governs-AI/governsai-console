import { PolicyConfig } from './types';

/**
 * ⚠️ DEPRECATED: These policies are kept for reference and testing only.
 *
 * In production, policies should be managed through the Platform API:
 * - Create/update policies in the Platform UI or via API
 * - Run `pnpm db:seed` to create default policies in the database
 * - Policies are fetched from /api/agents/policies at runtime
 *
 * If no policy is found, requests will be BLOCKED for security.
 */

// Default policy configuration for governance
export const DEFAULT_POLICY: PolicyConfig = {
  version: 'v1',
  defaults: {
    ingress: { action: 'redact' },
    egress: { action: 'redact' },
  },
  tool_access: {
    'weather_current': {
      direction: 'ingress',
      action: 'confirm',
      allow_pii: {},
    },
    'weather_forecast': {
      direction: 'ingress',
      action: 'confirm',
      allow_pii: {},
    },
    'payment_process': {
      direction: 'egress',
      action: 'confirm',
      allow_pii: {
        'PII:credit_card': 'tokenize',
        'PII:email_address': 'pass_through',
      },
    },
    'payment_refund': {
      direction: 'egress',
      action: 'confirm',
      allow_pii: {
        'PII:credit_card': 'tokenize',
      },
    },
    'db_query': {
      direction: 'both',
      action: 'redact',
      allow_pii: {
        'PII:email_address': 'redact',
        'PII:us_ssn': 'redact',
        'PII:phone_number': 'redact',
      },
    },
    'file_read': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'file_write': {
      direction: 'egress',
      action: 'redact',
      allow_pii: {},
    },
    'file_list': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
    'web_search': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'web_scrape': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'email_send': {
      direction: 'egress',
      action: 'redact',
      allow_pii: {
        'PII:email_address': 'pass_through',
        'PII:us_ssn': 'tokenize',
        'PII:phone_number': 'redact',
      },
    },
    'calendar_create_event': {
      direction: 'egress',
      action: 'allow',
      allow_pii: {
        'PII:email_address': 'pass_through',
      },
    },
    'kv_get': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'kv_set': {
      direction: 'egress',
      action: 'redact',
      allow_pii: {},
    },
    'model.chat': {
      direction: 'both',
      action: 'redact',
      allow_pii: {
        'PII:email_address': 'redact',
        'PII:us_ssn': 'redact',
        'PII:phone_number': 'redact',
        'PII:credit_card': 'redact',
      },
    },
  },
  deny_tools: [
    'python.exec',
    'bash.exec',
    'code.exec',
    'shell.exec',
    'system.reboot',
    'system.shutdown',
  ],
  allow_tools: [],
  network_scopes: ['net.'],
  network_tools: ['web.', 'http.', 'fetch.', 'request.', 'email.', 'calendar.'],
  on_error: 'block',
};

// Strict policy for high-security environments
export const STRICT_POLICY: PolicyConfig = {
  version: 'v1',
  defaults: {
    ingress: { action: 'block' },
    egress: { action: 'block' },
  },
  tool_access: {
    'weather_current': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
    'weather_forecast': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
  },
  deny_tools: [
    'python.exec',
    'bash.exec',
    'code.exec',
    'shell.exec',
    'system.reboot',
    'system.shutdown',
    'file_write',
    'db_query',
    'payment_process',
    'payment_refund',
  ],
  allow_tools: ['weather_current', 'weather_forecast', 'web_search'],
  network_scopes: ['net.'],
  network_tools: ['web.', 'http.', 'fetch.', 'request.'],
  on_error: 'block',
};

// Permissive policy for development environments
export const PERMISSIVE_POLICY: PolicyConfig = {
  version: 'v1',
  defaults: {
    ingress: { action: 'allow' },
    egress: { action: 'allow' },
  },
  tool_access: {},
  deny_tools: ['system.reboot', 'system.shutdown'],
  allow_tools: [],
  network_scopes: ['net.'],
  network_tools: ['web.', 'http.', 'fetch.', 'request.', 'email.', 'calendar.'],
  on_error: 'allow',
};
