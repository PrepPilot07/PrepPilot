import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'email-smtp.eu-north-1.amazonaws.com', // fallback to eu-north-1 if not specified
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
  },
});

export async function sendOTPVerificationEmail(toEmail: string, otpCode: string): Promise<void> {
  const fromEmail = process.env.SMTP_FROM_EMAIL as string;
  
  if (!fromEmail || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials missing. OTP email not sent.');
    return;
  }

  const htmlContent = `
    <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background-color: #059669; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="color: white; font-weight: bold; font-size: 24px; line-height: 48px;">P</span>
        </div>
        <h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 700;">Verify your email</h2>
      </div>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; text-align: center;">
        Thanks for joining PrepPilot! Please use the 6-digit verification code below to complete your registration. This code will expire in 15 minutes.
      </p>
      
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 4px;">${otpCode}</span>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"PrepPilot" <${fromEmail}>`,
      to: toEmail,
      subject: 'Your PrepPilot Verification Code',
      html: htmlContent,
    });
    console.log(`✅ OTP email sent successfully to ${toEmail}`);
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw new Error('Failed to send verification email');
  }
}
