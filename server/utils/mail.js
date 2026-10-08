import nodemailer from 'nodemailer';

let tx;
const transport = () => (tx ??= nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}));

// Emails the OTP. Without SMTP config (local dev only) the code is printed to the server console.
export async function sendOtp(email, code) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured');
    console.log(`[DEV] OTP for ${email}: ${code}`);
    return;
  }
  await transport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email,
    subject: 'Your VproTech verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<div style="font-family:Georgia,serif;max-width:420px;margin:auto;padding:32px;background:#f6f2ea;color:#16212f"><h2 style="margin:0 0 8px">VproTech Digital</h2><p>Use this code to verify your email and complete your registration.</p><p style="font-size:34px;letter-spacing:10px;font-weight:bold;color:#a8874a;margin:20px 0">${code}</p><p style="font-size:12px;color:#6b7280">Expires in 10 minutes. If you did not request this, ignore this email.</p></div>`,
  });
}
