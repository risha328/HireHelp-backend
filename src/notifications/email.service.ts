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

  async sendHireEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Congratulations! You've been hired for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Congratulations ${candidateName}!</h2>
          <p>We are thrilled to inform you that you've been selected for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          <p>The hiring team will be in touch with you soon to discuss the next steps, including your offer details.</p>
          <p>Welcome to the team!</p>
          <p>Best regards,<br>The HireHelp Team</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Hire email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending hire email:', error);
      throw error;
    }
  }

  async sendRejectionFromUnderReviewEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Application Update for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hello ${candidateName},</p>
          <p>Thank you for applying for the ${jobTitle} position at ${companyName}.</p>
          <p>After careful review, we will not be moving forward with your application at this time.</p>
          <p>We encourage you to apply for future opportunities.</p>
          <p>Best regards,<br>Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Rejection email (from under review) sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending rejection email:', error);
      throw error;
    }
  }

  async sendRejectionFromShortlistedEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Application Update for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hello ${candidateName},</p>
          <p>Thank you for taking the time to interview with us for the ${jobTitle} position at ${companyName}. We truly appreciate the effort you put into the interview process and the opportunity to learn more about your skills and experience.</p>
          <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this stage. This was a difficult decision due to the high quality of candidates we interviewed.</p>
          <p>We encourage you to apply for future opportunities with ${companyName} that align with your profile. We wish you the very best in your job search and future endeavors.</p>
          <p>Warm regards,<br>Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Rejection email (from shortlisted) sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending rejection email:', error);
      throw error;
    }
  }

  async sendMcqRoundEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string, googleFormLink: string, roundName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `MCQ Assessment for ${jobTitle} - ${roundName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Assessment Invitation</h2>
          <p>Dear ${candidateName},</p>
          <p>Congratulations! You've progressed to the next stage of our hiring process for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
          <p>You have been assigned to the <strong>${roundName}</strong> round, which consists of an MCQ (Multiple Choice Questions) assessment.</p>
          <p>Please complete the assessment by clicking the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${googleFormLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Start MCQ Assessment</a>
          </div>
          <p><strong>Important:</strong> Please complete the assessment within the specified timeframe. Your responses will be reviewed by our hiring team.</p>
          <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
          <p>Best regards,<br>The Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`MCQ round email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending MCQ round email:', error);
      throw error;
    }
  }

  async sendNextRoundEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string, nextRoundName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Congratulations! You've Advanced to the Next Round - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Congratulations!</h2>
          <p>Dear ${candidateName},</p>
          <p>Great news! You've successfully passed the previous round and have been selected to move forward in our hiring process for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
          <p>You are now scheduled for the next round: <strong>${nextRoundName}</strong>.</p>
          <p>Our team will be in touch soon with more details about the next steps, including scheduling and any preparation materials.</p>
          <p>We look forward to speaking with you again!</p>
          <p>Best regards,<br>The Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Next round email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending next round email:', error);
      throw error;
    }
  }
}
