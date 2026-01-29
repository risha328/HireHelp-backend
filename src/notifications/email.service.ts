import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendShortlistEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Congratulations! You've been shortlisted for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Congratulations ${candidateName}!</h2>
          <p>You've been shortlisted for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          <p>The hiring team will be in touch with you soon for the next steps in the recruitment process.</p>
          <p>Best regards,<br>The HireHelp Team</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Shortlist email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending shortlist email:', error);
      throw error;
    }
  }

  async sendApplicationConfirmationEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Application Confirmation for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Application Received!</h2>
          <p>Dear ${candidateName},</p>
          <p>Thank you for applying! Your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.</p>
          <p>We will review your application and get back to you soon.</p>
          <p>Best regards,<br>The HireHelp Team</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Application confirmation email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending application confirmation email:', error);
      throw error;
    }
  }
}
