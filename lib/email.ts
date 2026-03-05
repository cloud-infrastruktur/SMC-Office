import nodemailer from 'nodemailer';
import { prisma } from './db';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Holt die SMTP-Konfiguration aus der Datenbank
 */
export async function getSmtpConfig() {
  const config = await prisma.smtpConfig.findFirst({
    where: { isActive: true },
  });
  return config;
}

/**
 * Erstellt einen Nodemailer Transporter basierend auf DB-Konfiguration
 */
export async function createTransporter() {
  const config = await getSmtpConfig();
  
  if (!config) {
    throw new Error('Keine SMTP-Konfiguration gefunden. Bitte konfigurieren Sie SMTP im Admin-Bereich.');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });
}

/**
 * Sendet eine E-Mail über die konfigurierte SMTP-Verbindung
 * @throws Error mit detaillierter Fehlermeldung bei Verbindungs- oder Authentifizierungsfehlern
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    
    if (!config) {
      throw new Error('Keine SMTP-Konfiguration gefunden');
    }

    const transporter = await createTransporter();

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error: any) {
    // Detaillierte Fehlerausgabe basierend auf Fehlertyp
    let errorMessage = 'E-Mail-Versand fehlgeschlagen';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP-Authentifizierung fehlgeschlagen. Bitte überprüfen Sie Benutzername und Passwort.';
    } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      errorMessage = `SMTP-Verbindung fehlgeschlagen: ${error.message}. Bitte überprüfen Sie Host und Port.`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'SMTP-Verbindung Timeout. Server nicht erreichbar.';
    } else if (error.responseCode === 535) {
      errorMessage = 'SMTP-Authentifizierung abgelehnt (535). Bitte überprüfen Sie die Anmeldedaten.';
    } else if (error.message) {
      errorMessage = `SMTP-Fehler: ${error.message}`;
    }
    
    console.error('E-Mail-Versand fehlgeschlagen:', errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Sendet eine Kontaktformular-Nachricht an die konfigurierte Adresse
 */
export async function sendContactEmail(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<boolean> {
  const config = await getSmtpConfig();
  
  if (!config) {
    console.error('Keine SMTP-Konfiguration für Kontaktformular');
    return false;
  }

  const htmlContent = `
    <h2>Neue Kontaktanfrage über smc-office.eu</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 30%;">Name:</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${data.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">E-Mail:</td>
        <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${data.email}">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Telefon:</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${data.phone || 'Nicht angegeben'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Betreff:</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${data.subject || 'Kontaktanfrage'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; vertical-align: top;">Nachricht:</td>
        <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${data.message}</td>
      </tr>
    </table>
    <p style="margin-top: 20px; color: #666; font-size: 12px;">Diese Nachricht wurde über das Kontaktformular auf smc-office.eu gesendet.</p>
  `;

  const textContent = `
Neue Kontaktanfrage über smc-office.eu

Name: ${data.name}
E-Mail: ${data.email}
Telefon: ${data.phone || 'Nicht angegeben'}
Betreff: ${data.subject || 'Kontaktanfrage'}

Nachricht:
${data.message}
  `;

  return sendEmail({
    to: config.contactEmail,
    subject: `[Kontaktanfrage] ${data.subject || 'Neue Nachricht von ' + data.name}`,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Sendet eine Passwort-Reset E-Mail
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const config = await getSmtpConfig();
  
  if (!config) {
    console.error('Keine SMTP-Konfiguration für Passwort-Reset');
    return false;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Passwort zurücksetzen</h2>
      <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
      <p>Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:</p>
      <p style="margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Passwort zurücksetzen
        </a>
      </p>
      <p style="color: #666;">Dieser Link ist 1 Stunde gültig.</p>
      <p style="color: #666;">Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px;">Schwarz Management Consulting GmbH</p>
    </div>
  `;

  const textContent = `
Passwort zurücksetzen

Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.

Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:
${resetUrl}

Dieser Link ist 1 Stunde gültig.

Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.

Schwarz Management Consulting GmbH
  `;

  return sendEmail({
    to: email,
    subject: 'Passwort zurücksetzen - SMC Office',
    text: textContent,
    html: htmlContent,
  });
}
