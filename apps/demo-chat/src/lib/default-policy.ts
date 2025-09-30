import { PolicyConfig } from './types';

// Default policy configuration for governance
export const DEFAULT_POLICY: PolicyConfig = {
  version: 'v1',
  defaults: {
    ingress: { action: 'redact' },
    egress: { action: 'redact' },
  },
  tool_access: {
    'weather.current': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
    'weather.forecast': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
    'payment.process': {
      direction: 'egress',
      action: 'confirm',
      allow_pii: {
        'PII:credit_card': 'tokenize',
        'PII:email_address': 'pass_through',
      },
    },
    'payment.refund': {
      direction: 'egress',
      action: 'confirm',
      allow_pii: {
        'PII:credit_card': 'tokenize',
      },
    },
    'db.query': {
      direction: 'both',
      action: 'redact',
      allow_pii: {
        'PII:email_address': 'redact',
        'PII:us_ssn': 'redact',
        'PII:phone_number': 'redact',
      },
    },
    'file.read': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'file.write': {
      direction: 'egress',
      action: 'redact',
      allow_pii: {},
    },
    'file.list': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
    'web.search': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'web.scrape': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'email.send': {
      direction: 'egress',
      action: 'redact',
      allow_pii: {
        'PII:email_address': 'pass_through',
        'PII:us_ssn': 'tokenize',
        'PII:phone_number': 'redact',
      },
    },
    'calendar.create_event': {
      direction: 'egress',
      action: 'allow',
      allow_pii: {
        'PII:email_address': 'pass_through',
      },
    },
    'kv.get': {
      direction: 'ingress',
      action: 'redact',
      allow_pii: {},
    },
    'kv.set': {
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
    'weather.current': {
      direction: 'ingress',
      action: 'allow',
      allow_pii: {},
    },
    'weather.forecast': {
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
    'file.write',
    'db.query',
    'payment.process',
    'payment.refund',
  ],
  allow_tools: ['weather.current', 'weather.forecast', 'web.search'],
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
