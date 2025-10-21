# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of GovernsAI seriously. If you have discovered a security vulnerability, please follow these steps:

### How to Report

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [your-security-email@governsai.com]
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- We will acknowledge receipt of your report within 48 hours
- We will provide a detailed response within 7 days
- We will work with you to understand and resolve the issue
- We will keep you informed of our progress
- We will credit you in our security advisories (unless you prefer to remain anonymous)

## Security Best Practices

### Environment Variables

**CRITICAL:** Never commit `.env` files or any files containing secrets to version control.

#### Required Environment Variables

All production deployments **MUST** set the following environment variables:

```bash
# Authentication & Security (REQUIRED)
JWT_SECRET=<generate-32-byte-random-value>
PASSWORD_PEPPER=<generate-random-value>
WEBHOOK_SECRET=<generate-32-byte-random-value>
GOVERNS_WEBHOOK_SECRET=<generate-32-byte-random-value>
NEXTAUTH_SECRET=<generate-32-byte-random-value>
```

#### Generating Secure Secrets

Use cryptographically secure random values:

```bash
# Node.js method (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL method
openssl rand -hex 32

# Python method
python -c "import secrets; print(secrets.token_hex(32))"
```

**NEVER use default or example values in production.**

### Database Security

1. **Use strong database passwords** (minimum 16 characters, mixed case, numbers, symbols)
2. **Enable SSL/TLS** for database connections in production
3. **Restrict database access** to specific IP addresses/VPCs
4. **Regular backups** with encryption at rest
5. **Enable pgvector extension** only with proper permissions

### API Keys and Third-Party Services

1. **Rotate API keys regularly** (at least every 90 days)
2. **Use separate keys** for development, staging, and production
3. **Set spending limits** on provider dashboards (OpenAI, Resend, etc.)
4. **Monitor API usage** for anomalies
5. **Revoke unused keys** immediately

### CORS Configuration

In production, **NEVER** use `origin: '*'`. Always specify exact origins:

```bash
ALLOWED_ORIGINS=https://governsai.com,https://app.governsai.com
```

### HTTPS/TLS

1. **Always use HTTPS** in production
2. **Enable HSTS** (HTTP Strict Transport Security)
3. **Use TLS 1.2 or higher**
4. **Keep certificates up to date**

### Authentication

1. **Enable passkey authentication** where possible (most secure)
2. **Enforce strong passwords** (minimum 12 characters)
3. **Implement rate limiting** on authentication endpoints
4. **Monitor for brute force attacks**
5. **Use secure session management**

### Dependency Management

1. **Regularly update dependencies:**
   ```bash
   pnpm audit
   pnpm update
   ```
2. **Review security advisories** before updating
3. **Enable Dependabot** or similar automated scanning
4. **Pin critical dependencies** to specific versions

### Data Protection

1. **PII Detection:** Use the precheck service to detect and flag PII
2. **Data Encryption:** Encrypt sensitive data at rest
3. **Audit Logging:** Enable comprehensive audit logs
4. **Data Retention:** Implement appropriate data retention policies
5. **GDPR Compliance:** Ensure compliance with data protection regulations

### Webhook Security

1. **Always verify signatures** using `crypto.timingSafeEqual()`
2. **Validate timestamps** to prevent replay attacks
3. **Use HTTPS endpoints** for webhooks
4. **Implement rate limiting** on webhook endpoints

### Network Security

1. **Use VPCs or private networks** for service-to-service communication
2. **Implement IP whitelisting** where appropriate
3. **Enable firewall rules** to restrict access
4. **Use internal DNS** for service discovery

### Monitoring and Logging

1. **Enable comprehensive logging** (but never log secrets)
2. **Monitor for suspicious activity:**
   - Unusual API usage patterns
   - Failed authentication attempts
   - Abnormal spending spikes
3. **Set up alerts** for security events
4. **Regular security audits**

### Deployment Security

1. **Use environment variables** for all configuration
2. **Never expose debug endpoints** in production
3. **Disable verbose error messages** in production
4. **Implement health checks** without exposing sensitive info
5. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault, etc.)

## Security Checklist for Production Deployment

Before deploying to production, verify:

- [ ] All environment variables are set with secure, random values
- [ ] No `.env` files are committed to version control
- [ ] Database uses strong password and SSL/TLS
- [ ] CORS is configured with specific origins (no wildcards)
- [ ] HTTPS/TLS is enabled with valid certificates
- [ ] API keys are production-specific and rotated
- [ ] Rate limiting is enabled on all public endpoints
- [ ] Webhook signature verification is enabled
- [ ] Error messages don't expose sensitive information
- [ ] Logging doesn't include secrets or PII
- [ ] Dependencies are up to date and audited
- [ ] Monitoring and alerting are configured
- [ ] Backup and disaster recovery plans are in place

## Known Security Considerations

### API Key Storage

API keys are stored hashed in the database. Only the first 10 characters are logged for debugging purposes.

### Passkey Authentication

Passkeys use WebAuthn/FIDO2 standards for secure, phishing-resistant authentication.

### Budget Enforcement

Budget limits are enforced before AI API calls to prevent unexpected charges.

### Context Memory

Context memory uses vector embeddings stored in PostgreSQL with pgvector. Ensure proper database access controls.

## Security Updates

We will announce security updates through:

- GitHub Security Advisories
- Release notes
- Security mailing list (subscribe at [security@governsai.com])

## License and Liability

This software is provided under the Elastic License 2.0 (ELv2). See LICENSE file for details.

**Disclaimer:** While we implement security best practices, no system is completely secure. Use this software at your own risk and implement additional security measures appropriate for your use case.

---

**Last Updated:** 2025-10-21
