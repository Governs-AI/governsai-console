import 'server-only';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface InvitationEmailData {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
}

export interface VerificationEmailData {
  to: string;
  userName: string;
  verifyUrl: string;
}

export interface PasswordResetEmailData {
  to: string;
  userName: string;
  resetUrl: string;
}

/**
 * Send invitation email to join organization
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, inviterName, orgName, role, inviteUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're invited to join ${orgName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Join ${orgName} on GovernsAI</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hi there!</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.
            </p>
            
            <p style="font-size: 16px; margin: 0 0 30px 0;">
              GovernsAI is a powerful platform for managing AI governance, policies, and compliance. 
              Click the button below to accept your invitation and get started.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; margin: 0;">
              This invitation was sent by ${inviterName}. If you weren't expecting this invitation, 
              you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'GovernsAI <info@governsai.com>',
      to: [to],
      subject: `You're invited to join ${orgName}`,
      html,
    });

    console.log('✅ Invitation email sent:', result.data?.id);
    return { success: true };

  } catch (error) {
    console.error('❌ Failed to send invitation email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, verifyUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email address</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Welcome to GovernsAI</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hi ${userName || 'there'}!</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              Thank you for signing up for GovernsAI! To complete your registration and start using your account, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #667eea; word-break: break-all;">${verifyUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; margin: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with GovernsAI, 
              you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'GovernsAI <onboarding@resend.dev>',
      to: [to],
      subject: 'Verify your email address',
      html,
    });

    console.log('✅ Verification email sent:', result.data?.id);
    return { success: true };

  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, userName, resetUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Reset Password</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">GovernsAI Account</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; margin: 0 0 20px 0;">Hi ${userName || 'there'}!</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              We received a request to reset your password for your GovernsAI account. 
              Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; margin: 0;">
              This password reset link will expire in 1 hour. If you didn't request a password reset, 
              you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'GovernsAI <onboarding@resend.dev>',
      to: [to],
      subject: 'Reset your password',
      html,
    });

    console.log('✅ Password reset email sent:', result.data?.id);
    return { success: true };

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
