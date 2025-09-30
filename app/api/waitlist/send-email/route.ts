import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, audience, organization } = await request.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'support@belto.world',
        pass: 'ohyzrciwvhegjthf',
      },
    });

    const mailOptions = {
      from: '"SlyOS Team" <support@belto.world>',
      to: email,
      subject: 'Welcome to SlyOS - You are In! 🔥',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #06070a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #06070a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(15,17,25,0.98), rgba(6,7,10,0.98)); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; overflow: hidden;">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="width: 80px; height: 80px; margin: 0 auto 20px; padding: 16px; background: linear-gradient(120deg, rgba(255,122,24,0.1), rgba(255,184,0,0.1)); border-radius: 16px; border: 1px solid rgba(255,184,0,0.2);">
                <div style="font-size: 48px;">🔥</div>
              </div>
              
              <h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 900; background: linear-gradient(120deg, #ff7a18, #ffb800, #ff3d81); -webkit-background-clip: text; background-clip: text; color: transparent;">
                You are In!
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 18px; color: #c8cfdd; line-height: 1.6;">
                Welcome to the future of AI deployment. You are among the first <strong style="color: #ffb800;">100 builders</strong> to break free from cloud monopolies.
              </p>
              
              <div style="background: rgba(255,184,0,0.05); border-left: 3px solid #ffb800; padding: 20px; margin: 24px 0; text-align: left; border-radius: 8px;">
                <p style="margin: 0 0 12px; color: #ffb800; font-weight: 700; font-size: 16px;">What is Next?</p>
                <ul style="margin: 0; padding-left: 20px; color: #c8cfdd; line-height: 1.8;">
                  <li>You will receive <strong style="color: #ffb800;">1,000 free SLY credits</strong> when we launch</li>
                  <li>Priority access to private beta (Q1 2025)</li>
                  <li>Direct line to our team for onboarding support</li>
                  <li>Early access to new features and models</li>
                </ul>
              </div>
              
              ${organization ? `
              <p style="margin: 24px 0; color: #9fa8bf; font-size: 14px;">
                We have noted you are joining as <strong style="color: #c8cfdd;">${organization}</strong>. We will prioritize enterprise features for your use case.
              </p>
              ` : ''}
              
              <div style="margin: 32px 0;">
                <a href="https://slyos.world" style="display: inline-block; padding: 14px 32px; background: linear-gradient(120deg, #ff7a18, #ffb800); color: #111; text-decoration: none; font-weight: 700; border-radius: 12px; font-size: 16px;">
                  Visit SlyOS
                </a>
              </div>
              
              <div style="margin-top: 32px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="margin: 0 0 12px; color: #9fa8bf; font-size: 14px;">
                  Questions? Just reply to this email.
                </p>
                <p style="margin: 0; color: #9fa8bf; font-size: 14px;">
                  — The SlyOS Team
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; background: rgba(0,0,0,0.3); text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} SlyOS · Democratizing AI Deployment
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
