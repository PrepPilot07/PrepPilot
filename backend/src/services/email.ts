import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'email-smtp.eu-north-1.amazonaws.com', // fallback to eu-north-1 if not specified
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
  },
});

function otpEmailTemplate(heading: string, intro: string, otpCode: string): string {
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background-color: #059669; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="color: white; font-weight: bold; font-size: 24px; line-height: 48px;">P</span>
        </div>
        <h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 700;">${heading}</h2>
      </div>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; text-align: center;">
        ${intro}
      </p>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 4px;">${otpCode}</span>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;
}

/**
 * Sends a one-time code. Returns silently (without throwing) when SMTP is not
 * configured so local development never breaks; throws only when a configured
 * transport actually fails, so callers can decide how to surface it.
 */
async function sendOtpEmail(
  toEmail: string,
  subject: string,
  heading: string,
  intro: string,
  otpCode: string
): Promise<void> {
  const fromEmail = process.env.SMTP_FROM_EMAIL as string;

  if (!fromEmail || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials missing. OTP email not sent.');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"PrepPilot" <${fromEmail}>`,
      to: toEmail,
      subject,
      html: otpEmailTemplate(heading, intro, otpCode),
    });
    console.log(`✅ OTP email sent successfully to ${toEmail}`);
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw new Error('Failed to send verification email');
  }
}

export function sendOTPVerificationEmail(toEmail: string, otpCode: string): Promise<void> {
  return sendOtpEmail(
    toEmail,
    'Your PrepPilot Verification Code',
    'Verify your email',
    "Thanks for joining PrepPilot! Please use the 6-digit verification code below to complete your registration. This code will expire in 15 minutes.",
    otpCode
  );
}

export function sendPasswordResetEmail(toEmail: string, otpCode: string): Promise<void> {
  return sendOtpEmail(
    toEmail,
    'Reset your PrepPilot password',
    'Reset your password',
    'We received a request to reset your PrepPilot password. Use the 6-digit code below to continue. This code will expire in 15 minutes.',
    otpCode
  );
}
