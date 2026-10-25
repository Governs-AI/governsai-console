/**
 * Starter policies, shared by the policies page and the dashboard's
 * Get-started checklist.
 *
 * Action semantics (precheck, see precheck/PROJECT_SPECS.md § Policy Actions):
 * - defaults.<direction>.action applies to the whole request when no tool
 *   rule matches: allow / redact (PII only) / block / confirm.
 * - toolAccess.<tool>.action: block and confirm apply whether or not PII is
 *   present; allow/redact/tokenize decide what happens to detected PII.
 * - Code-execution tools (python.exec, bash.exec, …) are always denied unless
 *   listed in allowTools.
 */

export interface TemplateTool {
  toolName: string;
  riskLevel: string;
}

export interface PolicyDraft {
  name: string;
  description: string;
  version: string;
  defaults: { ingress: { action: string }; egress: { action: string } };
  toolAccess: Record<string, { direction: string; action: string; allow_pii: Record<string, string> }>;
  denyTools: string[];
  allowTools: string[];
  networkScopes: string[];
  networkTools: string[];
  onError: string;
  priority: number;
  isActive: boolean;
}

export interface PolicyTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  recommended?: boolean;
  build: (tools: TemplateTool[]) => PolicyDraft;
}

const base = (): PolicyDraft => ({
  name: '',
  description: '',
  version: 'v1',
  defaults: { ingress: { action: 'redact' }, egress: { action: 'redact' } },
  toolAccess: {},
  denyTools: [],
  allowTools: [],
  networkScopes: ['net.'],
  networkTools: ['web.', 'http.', 'fetch.', 'request.'],
  onError: 'block',
  priority: 0,
  isActive: true,
});

const rule = (action: string, allow_pii: Record<string, string> = {}) => ({
  direction: 'both',
  action,
  allow_pii,
});

const byRisk = (tools: TemplateTool[], levels: string[]) =>
  tools.filter((t) => levels.includes(t.riskLevel)).map((t) => t.toolName);

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'agent-guardrails',
    title: 'AI agent guardrails',
    description:
      'Redact PII before it reaches the model. Payments, refunds and outbound email wait for a human approval.',
    tags: ['Redact PII', 'Approve payments & email', 'Block code exec'],
    recommended: true,
    build: () => ({
      ...base(),
      name: 'AI agent guardrails',
      description:
        'Redact PII; require approval for payments, refunds and outbound email; code execution blocked.',
      toolAccess: {
        payment_process: rule('confirm'),
        payment_refund: rule('confirm'),
        email_send: rule('confirm'),
      },
      priority: 10,
    }),
  },
  {
    id: 'fintech-strict',
    title: 'Fintech: block card & SSN',
    description:
      'Refuse any request that contains a card number, SSN or bank account; redact all other PII.',
    tags: ['Block card / SSN / IBAN', 'Redact other PII'],
    build: () => {
      const block = {
        'PII:credit_card': 'block',
        'PII:us_ssn': 'block',
        'PII:iban_code': 'block',
        'PII:us_bank_number': 'block',
      };
      return {
        ...base(),
        name: 'Fintech: block card & SSN',
        description: 'Deny requests carrying card numbers, SSNs or bank accounts; redact other PII.',
        toolAccess: { 'model.chat': rule('redact', block) },
        priority: 20,
      };
    },
  },
  {
    id: 'review',
    title: 'High-risk review',
    description: 'Every high-risk or critical tool in your catalog needs a human approval.',
    tags: ['Confirm high-risk tools', 'Allow baseline traffic'],
    build: (tools) => ({
      ...base(),
      name: 'High-risk review',
      description: 'Require approval for high-risk tools while allowing standard traffic.',
      defaults: { ingress: { action: 'allow' }, egress: { action: 'allow' } },
      toolAccess: Object.fromEntries(
        byRisk(tools, ['high', 'critical']).map((name) => [name, rule('confirm')]),
      ),
      priority: 10,
    }),
  },
  {
    id: 'allowlist',
    title: 'Allowlist only',
    description: 'Block everything except the tools you list; allowed tools still get PII redaction.',
    tags: ['Block by default', 'Allowlist tools'],
    build: (tools) => ({
      ...base(),
      name: 'Allowlist only',
      description: 'Only listed tools may run (with PII redacted); everything else is blocked.',
      defaults: { ingress: { action: 'block' }, egress: { action: 'block' } },
      allowTools: ['model.chat', ...byRisk(tools, ['low']).filter((t) => t !== 'model.chat')].slice(0, 8),
      priority: 20,
    }),
  },
];

export function findTemplate(id: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find((t) => t.id === id);
}
