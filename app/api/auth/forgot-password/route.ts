import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail, getSmtpConfig } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie einen Link zum Zurücksetzen des Passworts.',
      });
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save the token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Try SMTP first
    const smtpConfig = await getSmtpConfig();
    
    if (smtpConfig) {
      // Use SMTP from database config
      const emailSent = await sendPasswordResetEmail(email, resetUrl);
      if (!emailSent) {
        console.error('SMTP E-Mail-Versand fehlgeschlagen');
      }
    } else {
      // Fallback: Abacus.AI API
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2463eb; margin: 0;">SMC</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Schwarz Management Consulting</p>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #2463eb; padding-bottom: 10px;">
            Passwort zurücksetzen
          </h2>
          
          <p style="color: #333; line-height: 1.6;">
            Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #2463eb 0%, #1d4ed8 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Passwort zurücksetzen
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br/>
            <a href="${resetUrl}" style="color: #2463eb; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 30px;">
            <p style="color: #666; font-size: 13px; margin: 0;">
              <strong>Hinweis:</strong> Dieser Link ist nur 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            © ${new Date().getFullYear()} Schwarz Management Consulting
          </p>
        </div>
      `;

      const appUrl = process.env.NEXTAUTH_URL || '';
      let senderEmail = 'noreply@mail.abacusai.app';
      try {
        if (appUrl) {
          const hostname = new URL(appUrl).hostname;
          senderEmail = `noreply@${hostname}`;
        }
      } catch (e) {
        // Use defaults
      }

      try {
        const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_PASSWORD_RESET,
            subject: 'Passwort zurücksetzen - SMC',
            body: htmlBody,
            is_html: true,
            recipient_email: email,
            sender_email: senderEmail,
            sender_alias: 'SMC',
          }),
        });

        const result = await response.json();
        if (!result.success) {
          console.error('Abacus.AI Email send error:', result);
        }
      } catch (e) {
        console.error('Fallback email error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie einen Link zum Zurücksetzen des Passworts.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}
