// ============================================================================
// EMAIL SENDING HELPERS (Direct Resend calls, not Convex actions)
// ============================================================================

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Logging prefix for easy filtering
const LOG_PREFIX = "[Resend Email]";

interface OrganizationInviteEmailParams {
  to: string;
  url: string;
  organizationName: string;
  inviterName?: string;
  role: string;
}

export async function sendOrganizationInvitationDirect(
  params: OrganizationInviteEmailParams,
) {
  const { to, url, organizationName, inviterName, role } = params;
  const from = process.env.RESEND_EMAIL_FROM || "";

  // console.log(LOG_PREFIX, "Sending organization invitation email:", {
  //   to,
  //   from,
  //   organizationName,
  //   inviterName,
  //   role,
  //   url,
  //   hasApiKey: !!process.env.RESEND_API_KEY,
  // });

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject: `You've been invited to join ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You're invited!</h1>
          <p>${inviterName ? `${inviterName} has` : "You have been"} invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
          <p>Click the button below to accept the invitation:</p>
          <a href="${url}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    // console.log(LOG_PREFIX, "Organization invitation email result:", result);
    return result;
  } catch (error) {
    console.error(LOG_PREFIX, "Failed to send organization invitation:", error);
    throw error;
  }
}

interface OTPEmailParams {
  to: string;
  code: string;
  type?: string;
}

export async function sendOTPVerificationDirect(params: OTPEmailParams) {
  const { to, code, type } = params;
  const from = process.env.RESEND_EMAIL_FROM || "";
  const isPasswordReset = type === "forget-password";
  const subject = isPasswordReset
    ? "Your password reset code"
    : "Your verification code";
  const heading = isPasswordReset ? "Password Reset Code" : "Verification Code";
  const body = isPasswordReset
    ? "Enter this code to reset your password:"
    : "Your verification code is:";

  // console.log(LOG_PREFIX, "Sending OTP verification email:", {
  //   to,
  //   from,
  //   codeLength: code.length,
  //   hasApiKey: !!process.env.RESEND_API_KEY,
  // });

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>${heading}</h1>
          <p>${body}</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });

    // console.log(LOG_PREFIX, "OTP verification email result:", result);
    return result;
  } catch (error) {
    console.error(LOG_PREFIX, "Failed to send OTP verification:", error);
    throw error;
  }
}
