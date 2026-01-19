import nodemailer from "nodemailer";

// Environment variables
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
// const MAIL_HOST = process.env.MAIL_HOST || "smtp.gmail.com";
// const MAIL_PORT = parseInt(process.env.MAIL_PORT || "587");
const MAIL_FROM = process.env.MAIL_FROM || "notifications@pinga.local";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Simple Nodemailer transporter (Gmail by default or generally SMTP)
// For Gmail you need an App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions) {
  if (!MAIL_USER || !MAIL_PASS) {
    console.warn("Email credentials missing. Logging email instead.");
    console.log(`[EMAIL to ${options.to}] Subject: ${options.subject}`);
    // console.log(options.html);
    return;
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

/**
 * Generate minimalist HTML template
 */
export function generateEmailHtml(
  title: string,
  content: string,
  actionUrl?: string,
  actionText?: string,
) {
  const buttonHtml = actionUrl
    ? `
    <div style="margin: 32px 0;">
      <a href="${actionUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        ${actionText}
      </a>
    </div>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">${title}</h1>
      <div style="font-size: 16px;">
        ${content}
      </div>
      ${buttonHtml}
      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 40px;" />
      <p style="color: #666; font-size: 14px;">Pinga Notifications</p>
    </body>
    </html>
  `;
}

/**
 * Send Magic Link Email
 */
export async function sendMagicLink(email: string, link: string, otp?: string) {
  const content = `
    <p>Click the button below to sign in. This link expires in 15 minutes.</p>
    ${otp ? `<div style="text-align: center; margin: 24px 0; background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</div>` : ""}
    <p>Or use the code above if you are logging in on a different device.</p>
  `;

  const html = generateEmailHtml(
    otp ? `Your Login Code: ${otp}` : "Sign in to Pinga",
    content,
    link,
    "Sign In",
  );

  await sendEmail({
    to: email,
    subject: otp ? `Your Login Code: ${otp}` : "Sign in to Pinga",
    html,
  });
}
