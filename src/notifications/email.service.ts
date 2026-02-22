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

  private getEmailHeader(): string {
    return `
      <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%); margin-bottom: 30px; border-radius: 8px 8px 0 0;">
        <img src="cid:logo" alt="HireHelp Logo" style="max-width: 200px; height: auto;">
      </div>
    `;
  }

  private getCommonAttachments() {
    return [{
      filename: 'logo.png',
      path: 'd:/Hirehelp/hirehelp-frontend/public/images/logo-transparent.png',
      cid: 'logo'
    }];
  }

  async sendShortlistEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${this.getEmailHeader()}
        <h2 style="color: #333;">Congratulations ${candidateName}!</h2>
        <p>You've been shortlisted for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
        <p>The hiring team will be in touch with you soon for the next steps in the recruitment process.</p>
        <p>Best regards,<br>The HireHelp Team</p>
      </div>
    `;
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Congratulations! You've been shortlisted for ${jobTitle}`,
      html: emailHtml, // Using variable for consistency
      attachments: this.getCommonAttachments()
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
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${this.getEmailHeader()}
        <h2 style="color: #333;">Application Received!</h2>
        <p>Dear ${candidateName},</p>
        <p>Thank you for applying! Your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.</p>
        <p>We will review your application and get back to you soon.</p>
        <p>Best regards,<br>The HireHelp Team</p>
      </div>
    `;
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Application Confirmation for ${jobTitle}`,
      html: emailHtml,
      attachments: this.getCommonAttachments()
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
          ${this.getEmailHeader()}
          <h2 style="color: #333;">Congratulations ${candidateName}!</h2>
          <p>We are thrilled to inform you that you've been selected for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          <p>The hiring team will be in touch with you soon to discuss the next steps, including your offer details.</p>
          <p>Welcome to the team!</p>
          <p>Best regards,<br>The HireHelp Team</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Hire email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending hire email:', error);
      throw error;
    }
  }

  async sendHoldEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Update on your application for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${this.getEmailHeader()}
          <h2 style="color: #333;">Application Update</h2>
          <p>Dear ${candidateName},</p>
          <p>Thank you for interviewing with us for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
          <p>We wanted to let you know that we've placed your application on <strong>hold</strong> for the moment as we continue to evaluate other candidates. This doesn't mean you're no longer in consideration; rather, we need a bit more time before making a final decision.</p>
          <p>We will get back to you with a definitive update as soon as possible.</p>
          <p>Best regards,<br>The HireHelp Team</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Hold email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending hold email:', error);
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
          ${this.getEmailHeader()}
          <p>Hello ${candidateName},</p>
          <p>Thank you for applying for the ${jobTitle} position at ${companyName}.</p>
          <p>After careful review, we will not be moving forward with your application at this time.</p>
          <p>We encourage you to apply for future opportunities.</p>
          <p>Best regards,<br>Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
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
          ${this.getEmailHeader()}
          <p>Hello ${candidateName},</p>
          <p>Thank you for taking the time to interview with us for the ${jobTitle} position at ${companyName}. We truly appreciate the effort you put into the interview process and the opportunity to learn more about your skills and experience.</p>
          <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this stage. This was a difficult decision due to the high quality of candidates we interviewed.</p>
          <p>We encourage you to apply for future opportunities with ${companyName} that align with your profile. We wish you the very best in your job search and future endeavors.</p>
          <p>Warm regards,<br>Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
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
          ${this.getEmailHeader()}
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
      attachments: this.getCommonAttachments()
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
          ${this.getEmailHeader()}
          <h2 style="color: #333;">Congratulations!</h2>
          <p>Dear ${candidateName},</p>
          <p>Great news! You've successfully passed the previous round and have been selected to move forward in our hiring process for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
          <p>You are now scheduled for the next round: <strong>${nextRoundName}</strong>.</p>
          <p>Our team will be in touch soon with more details about the next steps, including scheduling and any preparation materials.</p>
          <p>We look forward to speaking with you again!</p>
          <p>Best regards,<br>The Hiring Team<br>${companyName}<br>(via HireHelp)</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Next round email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending next round email:', error);
      throw error;
    }
  }

  async sendCodingTestEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string, platformName: string, duration: string, instructions: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Coding Test Invitation - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${this.getEmailHeader()}
          <p>Hi ${candidateName},</p>
          
          <p><strong>Congratulations 🎉</strong></p>
          <p>You have been shortlisted for the Coding Test round for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
          
          <p>Please read the instructions carefully before attempting the test.</p>
          
          <h3 style="color: #333; margin-top: 20px;">Coding Test Instructions:</h3>
          <ul style="line-height: 1.8;">
            <li>• The coding test will be conducted online.</li>
            <li>• The test link will be shared with you separately.</li>
            <li>• The duration of the test will be <strong>${duration || 'TBD'}</strong> minutes.</li>
            <li>• You are required to solve the given problem(s) within the allotted time.</li>
            <li>• Any form of plagiarism or unfair practices may lead to disqualification.</li>
            <li>• Ensure a stable internet connection during the test.</li>
            <li>• Use only the allowed programming languages mentioned in the test instructions.</li>
          </ul>
          
          <p style="margin-top: 20px;"><strong>Important Note:</strong></p>
          <p>👉 The coding test link will be shared with you shortly. Please keep an eye on your registered email address.</p>
          
          <p style="margin-top: 20px;">If you have any questions, feel free to reach out to us.</p>
          
          <p style="margin-top: 30px;">Best of luck 👍</p>
          <p>Regards,<br>${companyName} Hiring Team</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
    };

    console.log('📧 Attempting to send coding test email...');
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? '***configured***' : 'NOT SET',
    });

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Coding test email sent successfully to ${candidateEmail}`);
      console.log('Email result:', result);
    } catch (error) {
      console.error('❌ Error sending coding test email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        command: error.command
      });
      throw error; // Throw error so we know when email fails
    }
  }

  async sendMcqRejectionEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Update on Your Application – ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${this.getEmailHeader()}
          <p>Hi ${candidateName},</p>
          <p>Thank you for taking the time to complete the MCQ assessment for the <strong>${jobTitle}</strong> role.</p>
          <p>After careful evaluation, we regret to inform you that you have not been shortlisted for the next round at this time.</p>
          <p>We truly appreciate your interest in <strong>${companyName}</strong> and encourage you to apply again in the future.</p>
          <p>Wishing you success ahead.</p>
          
          <p>Regards,</p>
          <p>${companyName} Hiring Team</p>
        </div>
      `,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`MCQ rejection email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending MCQ rejection email:', error);
      // Don't throw to prevent blocking
    }
  }

  async sendInterviewerAssignmentEmail(
    interviewerEmail: string,
    interviewerName: string,
    candidateName: string,
    position: string,
    experience: string,
    date: string,
    time: string,
    mode: string,
    venueOrPlatform: string,
    instructions: string,
    roundType: string,
    reportingTime?: string,
    locationDetails?: {
      venueName: string;
      address: string;
      city: string;
      landmark?: string;
    }
  ): Promise<void> {
    const isOffline = mode.toLowerCase() === 'offline';

    // specific formatting for venue/platform
    let venueDisplay = '';
    if (isOffline && locationDetails) {
      venueDisplay = `
        <strong>Venue:</strong> ${locationDetails.venueName}<br>
        <strong>Address:</strong> ${locationDetails.address}<br>
        <strong>City:</strong> ${locationDetails.city}
        ${locationDetails.landmark ? `<br><strong>Landmark:</strong> ${locationDetails.landmark}` : ''}
      `;
    } else if (isOffline) {
      venueDisplay = `<strong>Venue:</strong> ${venueOrPlatform || 'Venue details to be shared'}`;
    } else {
      venueDisplay = `<strong>Platform:</strong> ${venueOrPlatform || 'Online Platform'}`;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: interviewerEmail,
      subject: `Interview Assignment - ${roundType} - ${candidateName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${interviewerName},</p>

          <p>You have been assigned a <strong>${roundType} (${mode})</strong> for the following candidate:</p>

          <h3 style="border-bottom: 2px solid #e0e0e0; padding-bottom: 5px; margin-top: 25px; color: #2c3e50;">Candidate Details</h3>
          <ul style="list-style-type: none; padding-left: 0; margin-top: 10px;">
            <li style="margin-bottom: 8px;">• <strong>Name:</strong> ${candidateName}</li>
            <li style="margin-bottom: 8px;">• <strong>Position:</strong> ${position}</li>
          </ul>

          <h3 style="border-bottom: 2px solid #e0e0e0; padding-bottom: 5px; margin-top: 25px; color: #2c3e50;">Interview Schedule</h3>
          <ul style="list-style-type: none; padding-left: 0; margin-top: 10px;">
            <li style="margin-bottom: 8px;">• <strong>Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>Time:</strong> ${time}</li>
            ${reportingTime ? `<li style="margin-bottom: 8px;">• <strong>Reporting Time:</strong> ${reportingTime}</li>` : ''}
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> ${mode}</li>
            <li style="margin-bottom: 8px;">• ${venueDisplay}</li>
          </ul>

          <h3 style="border-bottom: 2px solid #e0e0e0; padding-bottom: 5px; margin-top: 25px; color: #2c3e50;">Instructions for Interviewer</h3>
          <div style="margin-top: 10px;">
             ${instructions ? instructions.split('\n').map(inst => `<p style="margin: 5px 0;">${inst}</p>`).join('') : `
            <p style="margin: 5px 0;">Assess technical fundamentals and problem-solving skills</p>
            <p style="margin: 5px 0;">Evaluate communication and approach</p>
            <p style="margin: 5px 0;">Provide feedback after the interview in the admin panel</p>
             `}
          </div>

          <p style="margin-top: 30px;">Please ensure you are available at the scheduled time.</p>

          <p>Best regards,<br>HireHelp Admin System</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Interview assignment email sent to ${interviewerEmail}`);
    } catch (error) {
      console.error('Error sending interview assignment email:', error);
      // We don't throw here to allow round creation to succeed even if email fails
    }
  }

  async sendCandidateInterviewNotificationEmail(
    candidateEmail: string,
    candidateName: string,
    position: string,
    roundName: string,
    experience: string,
    date: string,
    time: string,
    mode: string,
    venueOrPlatform: string,
    instructions: string,
    reportingTime?: string,
    locationDetails?: {
      venueName: string;
      address: string;
      city: string;
      landmark?: string;
    }
  ): Promise<void> {
    const isOffline = mode.toLowerCase() === 'offline';

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Interview Scheduled - ${position} - ${roundName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p>Hello ${candidateName},</p>

          <p>Congratulations! You have progressed to the next stage of our hiring process for the <strong>${position}</strong> position.</p>

          <p>You have been scheduled for a <strong>${roundName} (${mode})</strong>.</p>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Interview Schedule</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li style="margin-bottom: 8px;">• <strong>Date:</strong> ${date}</li>
              <li style="margin-bottom: 8px;">• <strong>Time:</strong> ${time}</li>
              ${reportingTime ? `<li style="margin-bottom: 8px;">• <strong>Reporting Time:</strong> ${reportingTime}</li>` : ''}
              <li style="margin-bottom: 8px;">• <strong>Mode:</strong> ${mode}</li>
              ${isOffline ? (locationDetails ? `
                <li style="margin-bottom: 8px;">• <strong>Venue:</strong> ${locationDetails.venueName}</li>
                <li style="margin-bottom: 8px;">• <strong>Address:</strong> ${locationDetails.address}</li>
                <li style="margin-bottom: 8px;">• <strong>City:</strong> ${locationDetails.city}</li>
                ${locationDetails.landmark ? `<li style="margin-bottom: 8px;">• <strong>Landmark:</strong> ${locationDetails.landmark}</li>` : ''}
              ` : `
                <li style="margin-bottom: 8px;">• <strong>Venue:</strong> ${venueOrPlatform || 'Venue details to be shared'}</li>
              `) : (venueOrPlatform ? `
                <li style="margin-bottom: 8px;">• <strong>Meeting Link:</strong><br>
                  <a href="${venueOrPlatform}" style="color: #007bff; text-decoration: none;">${venueOrPlatform}</a>
                </li>
              ` : '')}
            </ul>
          </div>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c3e50;">Instructions for Candidate</h3>
            <ul style="padding-left: 20px;">
              ${isOffline ? '<li>Carry CV, photograph and marksheet and proper Reporting time mentioned</li>' : `
              <li>Prepare for technical questions related to fundamentals and problem-solving</li>
              <li>Ensure you have a stable internet connection if online</li>
              <li>Be ready to discuss your experience and approach</li>
              <li>Join the meeting 5 minutes early</li>
              `}
            </ul>
          </div>

          <p>Please ensure you are available at the scheduled time. If you have any questions or need to reschedule, please contact us immediately.</p>

          <p>Best regards,<br>HireHelp Team</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Candidate interview notification email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending candidate interview notification email:', error);
      // We don't throw here to allow status update to succeed even if email fails
    }
  }

  async sendInvitationEmail(
    email: string,
    name: string,
    role: string,
    companyName: string,
    tempPassword: string
  ): Promise<void> {
    const roleDisplay = role === 'COMPANY_ADMIN' ? 'Company Admin' : 'Interviewer';

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: `Welcome to HireHelp! Invitation to join ${companyName}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #2c3e50;">Hello ${name},</h2>
        
        <p>Welcome to HireHelp!</p>
        
        <p>You have been added as a team member to the <strong>${companyName}</strong> account by the Company Admin.</p>
        
        <p>Your role: <strong>${roleDisplay}</strong></p>
        
        <p>You now have access to collaborate on hiring activities, including:</p>
        
        <ul style="padding-left: 20px;">
          <li style="margin-bottom: 5px;">• Managing interviews</li>
          <li style="margin-bottom: 5px;">• Reviewing candidate profiles</li>
          <li style="margin-bottom: 5px;">• Submitting feedback</li>
          <li style="margin-bottom: 5px;">• Tracking hiring progress</li>
        </ul>
        
        <br>
        
        <p>If you have any questions regarding your responsibilities or system access, please reach out to your Company Admin.</p>
        
        <p>We look forward to your contribution to the hiring process.</p>
        
        <br>
        
        <p>Best regards,<br>HireHelp Team<br><a href="mailto:hirehelp23@gmail.com" style="color: #007bff; text-decoration: none;">hirehelp23@gmail.com</a></p>
      </div>
    `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Invitation email sent to ${email}`);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  }

  /**
   * Send interview scheduled email to candidate
   * Sends different templates based on interview mode (online/offline)
   */
  async sendCandidateInterviewScheduledEmail(
    candidateEmail: string,
    candidateName: string,
    position: string,
    interviewType: string, // 'Technical Interview', 'HR Interview', etc.
    date: string,
    time: string,
    mode: string, // 'virtual' or 'in-person'
    platform?: string, // 'Google Meet', 'Zoom', 'Microsoft Teams'
    meetingLink?: string,
    reportingTime?: string,
    companyName?: string,
    locationDetails?: {
      venueName: string;
      address: string;
      city: string;
      landmark?: string;
    },
    contactEmail?: string,
    contactPhone?: string
  ): Promise<void> {
    const isOnline = mode.toLowerCase() === 'virtual' || mode.toLowerCase() === 'online';
    const companyDisplay = companyName || 'HireHelp';
    const contactInfo = contactEmail || 'hirehelp23@gmail.com';

    let emailHtml = '';

    if (isOnline) {
      // Online Interview Template
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${candidateName},</p>

          <p><strong>Congratulations!</strong></p>

          <p>You have progressed to the next stage of our hiring process for the <strong>${position}</strong> position. We are pleased to invite you to attend the ${interviewType} as per the details below.</p>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Interview Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Online</li>
            <li style="margin-bottom: 8px;">• <strong>Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>Time:</strong> ${time}</li>
            <li style="margin-bottom: 8px;">• <strong>Platform:</strong> ${platform || 'To be shared'}</li>
            ${meetingLink ? `<li style="margin-bottom: 8px;">• <strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #007bff; text-decoration: none;">${meetingLink}</a></li>` : ''}
          </ul>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Instructions for the Interview</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">Please join the meeting 5–10 minutes before the scheduled time</li>
            <li style="margin-bottom: 8px;">Ensure you have a stable internet connection</li>
            <li style="margin-bottom: 8px;">Keep your camera and microphone functional</li>
            <li style="margin-bottom: 8px;">Be prepared to share your screen if required</li>
            <li style="margin-bottom: 8px;">Keep your updated CV accessible during the interview</li>
          </ul>

          <p style="margin-top: 25px;">If you experience any technical issues or require rescheduling, please notify us immediately.</p>

          <p>We look forward to speaking with you and learning more about your experience.</p>

          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Team<br>${contactInfo}${contactPhone ? ` / ${contactPhone}` : ''}</p>
        </div>
      `;
    } else {
      // Offline Interview Template
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${candidateName},</p>

          <p><strong>Congratulations!</strong></p>

          <p>You have progressed to the next stage of our hiring process for the <strong>${position}</strong> position. We are pleased to invite you to attend the ${interviewType} as per the details below.</p>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Interview Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Offline</li>
            <li style="margin-bottom: 8px;">• <strong>Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>Time:</strong> ${time}</li>
            ${reportingTime ? `<li style="margin-bottom: 8px;">• <strong>Reporting Time:</strong> ${reportingTime}</li>` : ''}
          </ul>

          ${locationDetails ? `
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Venue Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Company Name:</strong> ${companyDisplay}</li>
            <li style="margin-bottom: 8px;">• <strong>Venue:</strong> ${locationDetails.venueName}</li>
            <li style="margin-bottom: 8px;">• <strong>Address:</strong> ${locationDetails.address}</li>
            <li style="margin-bottom: 8px;">• <strong>City:</strong> ${locationDetails.city}</li>
            ${locationDetails.landmark ? `<li style="margin-bottom: 8px;">• <strong>Landmark:</strong> ${locationDetails.landmark}</li>` : ''}
          </ul>
          ` : ''}

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Instructions for the Interview</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">Please arrive at the venue at the reporting time mentioned above</li>
            <li style="margin-bottom: 8px;">Carry a printed copy of your updated CV</li>
            <li style="margin-bottom: 8px;">Bring a valid photo ID for verification</li>
            <li style="margin-bottom: 8px;">Dress formally for the interview</li>
            <li style="margin-bottom: 8px;">Be prepared to discuss your experience and skills</li>
          </ul>

          <p style="margin-top: 25px;">If you need to reschedule or have any questions, please notify us immediately.</p>

          <p>We look forward to meeting you in person.</p>

          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Team<br>${contactInfo}${contactPhone ? ` / ${contactPhone}` : ''}</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Interview Scheduled - ${interviewType} - ${position}`,
      html: emailHtml,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Candidate interview scheduled email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending candidate interview scheduled email:', error);
      // Don't throw to prevent blocking the scheduling process
    }
  }

  /**
   * Send interview scheduled email to interviewer
   * Sends different templates based on interview mode (online/offline)
   */
  async sendInterviewerScheduledEmail(
    interviewerEmail: string,
    interviewerName: string,
    candidateName: string,
    position: string,
    experience: string,
    interviewType: string, // 'Technical Interview', 'HR Interview', etc.
    date: string,
    time: string,
    mode: string, // 'virtual' or 'in-person'
    platform?: string,
    meetingLink?: string,
    reportingTime?: string,
    companyName?: string,
    locationDetails?: {
      venueName: string;
      address: string;
      city: string;
      landmark?: string;
    },
    contactEmail?: string
  ): Promise<void> {
    const isOnline = mode.toLowerCase() === 'virtual' || mode.toLowerCase() === 'online';
    const companyDisplay = companyName || 'HireHelp';
    const contactInfo = contactEmail || 'hirehelp23@gmail.com';

    let emailHtml = '';

    if (isOnline) {
      // Online Interview Template for Interviewer
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${interviewerName},</p>

          <p>You have been assigned to conduct a ${interviewType} for the following candidate as part of our hiring process.</p>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Candidate Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Name:</strong> ${candidateName}</li>
            <li style="margin-bottom: 8px;">• <strong>Position:</strong> ${position}</li>
          </ul>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Interview Schedule</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Online</li>
            <li style="margin-bottom: 8px;">• <strong>Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>Time:</strong> ${time}</li>
            <li style="margin-bottom: 8px;">• <strong>Platform:</strong> ${platform || 'To be shared'}</li>
            ${meetingLink ? `<li style="margin-bottom: 8px;">• <strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #007bff; text-decoration: none;">${meetingLink}</a></li>` : ''}
          </ul>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Interviewer Instructions</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">Please join the meeting 5–10 minutes before the scheduled time</li>
            <li style="margin-bottom: 8px;">Ensure your audio and video devices are functioning properly</li>
            <li style="margin-bottom: 8px;">Assess technical knowledge, coding ability, and system understanding</li>
            <li style="margin-bottom: 8px;">Evaluate communication skills and overall problem-solving approach</li>
            <li style="margin-bottom: 8px;">Submit structured feedback in the admin panel immediately after the interview</li>
          </ul>

          <p style="margin-top: 25px;">In case of technical difficulties or scheduling conflicts, please inform the HR team promptly.</p>

          <p>We appreciate your cooperation in ensuring a smooth interview process.</p>

          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Admin System<br>${contactInfo}</p>
        </div>
      `;
    } else {
      // Offline Interview Template for Interviewer
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${interviewerName},</p>

          <p>You have been assigned to conduct a ${interviewType} for the following candidate as part of our hiring process.</p>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Candidate Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Name:</strong> ${candidateName}</li>
            <li style="margin-bottom: 8px;">• <strong>Position:</strong> ${position}</li>
          </ul>

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Interview Schedule</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Offline</li>
            <li style="margin-bottom: 8px;">• <strong>Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>Time:</strong> ${time}</li>
            ${reportingTime ? `<li style="margin-bottom: 8px;">• <strong>Reporting Time (Candidate):</strong> ${reportingTime}</li>` : ''}
          </ul>

          ${locationDetails ? `
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Venue Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Company Name:</strong> ${companyDisplay}</li>
            <li style="margin-bottom: 8px;">• <strong>Venue:</strong> ${locationDetails.venueName}</li>
            <li style="margin-bottom: 8px;">• <strong>Address:</strong> ${locationDetails.address}</li>
            <li style="margin-bottom: 8px;">• <strong>City:</strong> ${locationDetails.city}</li>
            ${locationDetails.landmark ? `<li style="margin-bottom: 8px;">• <strong>Landmark:</strong> ${locationDetails.landmark}</li>` : ''}
          </ul>
          ` : ''}

          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Interviewer Instructions</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">Please assess the candidate's technical fundamentals and practical knowledge</li>
            <li style="margin-bottom: 8px;">Evaluate problem-solving skills and communication ability</li>
            <li style="margin-bottom: 8px;">Discuss relevant project experience</li>
            <li style="margin-bottom: 8px;">Provide structured feedback in the admin panel immediately after the interview</li>
            <li style="margin-bottom: 8px;">Notify HR in case of candidate absence or delay</li>
          </ul>

          <p style="margin-top: 25px;">Kindly confirm your availability for the scheduled interview. If you foresee any scheduling conflict, please inform the HR team at the earliest.</p>

          <p>Thank you for your support in the recruitment process.</p>

          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Admin System<br>${contactInfo}</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: interviewerEmail,
      subject: `Interview Assignment - ${interviewType} - ${candidateName}`,
      html: emailHtml,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Interviewer scheduled email sent to ${interviewerEmail}`);
    } catch (error) {
      console.error('Error sending interviewer scheduled email:', error);
      // Don't throw to prevent blocking the scheduling process
    }
  }

  /**
   * Send interview rescheduled email to candidate
   */
  async sendCandidateInterviewRescheduledEmail(
    candidateEmail: string,
    candidateName: string,
    position: string,
    interviewType: string,
    date: string,
    time: string,
    mode: string,
    platform?: string,
    meetingLink?: string,
    reportingTime?: string,
    companyName?: string,
    locationDetails?: {
      venueName: string;
      address: string;
      city: string;
      landmark?: string;
    },
    contactEmail?: string,
    contactPhone?: string
  ): Promise<void> {
    const isOnline = mode.toLowerCase() === 'virtual' || mode.toLowerCase() === 'online';
    const companyDisplay = companyName || 'HireHelp';
    const contactInfo = contactEmail || 'hirehelp23@gmail.com';

    let emailHtml = '';

    if (isOnline) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${candidateName},</p>
          <p><strong>Your interview has been rescheduled.</strong></p>
          <p>We are writing to inform you that your ${interviewType} for the <strong>${position}</strong> position has been rescheduled to a new time. Please see the updated details below.</p>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Updated Interview Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Online</li>
            <li style="margin-bottom: 8px;">• <strong>New Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>New Time:</strong> ${time}</li>
            <li style="margin-bottom: 8px;">• <strong>Platform:</strong> ${platform || 'To be shared'}</li>
            ${meetingLink ? `<li style="margin-bottom: 8px;">• <strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #007bff; text-decoration: none;">${meetingLink}</a></li>` : ''}
          </ul>
          <p style="margin-top: 25px;">If you have any questions, please notify us immediately.</p>
          <p>We look forward to speaking with you.</p>
          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Team<br>${contactInfo}${contactPhone ? ` / ${contactPhone}` : ''}</p>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${candidateName},</p>
          <p><strong>Your interview has been rescheduled.</strong></p>
          <p>We are writing to inform you that your ${interviewType} for the <strong>${position}</strong> position has been rescheduled. Please see the updated venue and time details below.</p>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Updated Interview Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Offline</li>
            <li style="margin-bottom: 8px;">• <strong>New Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>New Time:</strong> ${time}</li>
            ${reportingTime ? `<li style="margin-bottom: 8px;">• <strong>Updated Reporting Time:</strong> ${reportingTime}</li>` : ''}
          </ul>
          ${locationDetails ? `
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Venue Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Venue:</strong> ${locationDetails.venueName}</li>
            <li style="margin-bottom: 8px;">• <strong>Address:</strong> ${locationDetails.address}</li>
            <li style="margin-bottom: 8px;">• <strong>City:</strong> ${locationDetails.city}</li>
            ${locationDetails.landmark ? `<li style="margin-bottom: 8px;">• <strong>Landmark:</strong> ${locationDetails.landmark}</li>` : ''}
          </ul>
          ` : ''}
          <p style="margin-top: 25px;">If you need to reschedule or have any questions, please notify us immediately.</p>
          <p>We look forward to meeting you.</p>
          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Team<br>${contactInfo}${contactPhone ? ` / ${contactPhone}` : ''}</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `RESCHEDULED: Interview for ${position}`,
      html: emailHtml,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Candidate interview rescheduled email sent to ${candidateEmail}`);
    } catch (error) {
      console.error('Error sending candidate interview rescheduled email:', error);
    }
  }

  /**
   * Send interview rescheduled email to interviewer
   */
  async sendInterviewerRescheduledEmail(
    interviewerEmail: string,
    interviewerName: string,
    candidateName: string,
    position: string,
    interviewType: string,
    date: string,
    time: string,
    mode: string,
    platform?: string,
    meetingLink?: string,
    reportingTime?: string,
    companyName?: string,
    locationDetails?: {
      venueName: string;
      address: string;
      city: string;
      landmark?: string;
    },
    contactEmail?: string
  ): Promise<void> {
    const isOnline = mode.toLowerCase() === 'virtual' || mode.toLowerCase() === 'online';
    const companyDisplay = companyName || 'HireHelp';
    const contactInfo = contactEmail || 'hirehelp23@gmail.com';

    let emailHtml = '';

    if (isOnline) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${interviewerName},</p>
          <p><strong>Interview Rescheduled Notification</strong></p>
          <p>The ${interviewType} for candidate <strong>${candidateName}</strong> (${position}) has been rescheduled. Please update your calendar with the new time below.</p>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">New Schedule</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Online</li>
            <li style="margin-bottom: 8px;">• <strong>New Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>New Time:</strong> ${time}</li>
            <li style="margin-bottom: 8px;">• <strong>Platform:</strong> ${platform || 'To be shared'}</li>
            ${meetingLink ? `<li style="margin-bottom: 8px;">• <strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #007bff; text-decoration: none;">${meetingLink}</a></li>` : ''}
          </ul>
          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Admin System<br>${contactInfo}</p>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <p>Hello ${interviewerName},</p>
          <p><strong>Interview Rescheduled Notification</strong></p>
          <p>The ${interviewType} for candidate <strong>${candidateName}</strong> (${position}) has been rescheduled. Please see the new time and venue details below.</p>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">New Schedule</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Mode:</strong> Offline</li>
            <li style="margin-bottom: 8px;">• <strong>New Date:</strong> ${date}</li>
            <li style="margin-bottom: 8px;">• <strong>New Time:</strong> ${time}</li>
          </ul>
          ${locationDetails ? `
          <h3 style="color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px;">Venue Details</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;">• <strong>Venue:</strong> ${locationDetails.venueName}</li>
            <li style="margin-bottom: 8px;">• <strong>Address:</strong> ${locationDetails.address}</li>
            <li style="margin-bottom: 8px;">• <strong>City:</strong> ${locationDetails.city}</li>
          </ul>
          ` : ''}
          <p style="margin-top: 30px;">Best regards,<br>${companyDisplay} Admin System<br>${contactInfo}</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: interviewerEmail,
      subject: `RESCHEDULED: Interview assignment - ${candidateName}`,
      html: emailHtml,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Interviewer rescheduled email sent to ${interviewerEmail}`);
    } catch (error) {
      console.error('Error sending interviewer rescheduled email:', error);
    }
  }

  async sendCandidateWelcomeEmail(email: string, name: string): Promise<void> {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        ${this.getEmailHeader()}
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px;">Welcome to <strong>HireHelp</strong>!</p>
          <p style="font-size: 16px;">We’re pleased to inform you that your account has been successfully created. You can now explore job opportunities, apply to positions, and track your application status in real time.</p>
          
          <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bae6fd;">
            <h3 style="margin-top: 0; color: #0369a1; font-size: 18px;">What you can do next:</h3>
            <ul style="padding-left: 20px; font-size: 15px; color: #334155;">
              <li style="margin-bottom: 8px;">Complete your profile to increase visibility to employers</li>
              <li style="margin-bottom: 8px;">Upload your updated resume</li>
              <li style="margin-bottom: 8px;">Browse and apply for relevant job openings</li>
              <li style="margin-bottom: 0;">Track your application progress from your dashboard</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">HireHelp is designed to make your job search smooth, transparent, and efficient. We’re excited to support you in your career journey.</p>
          <p style="font-size: 16px;">If you need any assistance, feel free to reach out to our support team.</p>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 16px; color: #64748b;">Best regards,</p>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0284c7;">HireHelp Team</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to HireHelp!',
      html: emailHtml,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Candidate welcome email sent to ${email}`);
    } catch (error) {
      console.error('Error sending candidate welcome email:', error);
    }
  }

  async sendCompanyAdminWelcomeEmail(email: string, name: string): Promise<void> {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        ${this.getEmailHeader()}
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px;">Welcome to <strong>HireHelp</strong>!</p>
          <p style="font-size: 16px;">Your Company Admin account has been successfully registered. You can now begin managing your company’s hiring process through our platform.</p>
          
          <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bae6fd;">
            <h3 style="margin-top: 0; color: #0369a1; font-size: 18px;">With your account, you can:</h3>
            <ul style="padding-left: 20px; font-size: 15px; color: #334155;">
              <li style="margin-bottom: 8px;">Post and manage job openings</li>
              <li style="margin-bottom: 8px;">Create and manage interview rounds (Technical, HR, etc.)</li>
              <li style="margin-bottom: 8px;">Schedule interviews candidate-wise and interviewer-wise</li>
              <li style="margin-bottom: 8px;">Track applications using the Kanban recruitment board</li>
              <li style="margin-bottom: 0;">Invite team members and interview panelists</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">We’re excited to support your recruitment process with a streamlined and professional hiring system.</p>
          <p style="font-size: 16px;">If you require any assistance setting up your company profile or hiring workflow, our support team is here to help.</p>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 16px; color: #64748b;">Best regards,</p>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0284c7;">HireHelp Team</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to HireHelp!',
      html: emailHtml,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Company Admin welcome email sent to ${email}`);
    } catch (error) {
      console.error('Error sending company admin welcome email:', error);
    }
  }

  async sendSuperAdminWelcomeEmail(email: string, name: string): Promise<void> {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        ${this.getEmailHeader()}
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px;">Your Super Admin account has been successfully created.</p>
          
          <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bae6fd;">
            <h3 style="margin-top: 0; color: #0369a1; font-size: 18px;">You now have full administrative access to the HireHelp platform, including:</h3>
            <ul style="padding-left: 20px; font-size: 15px; color: #334155;">
              <li style="margin-bottom: 8px;">Managing company accounts</li>
              <li style="margin-bottom: 8px;">Monitoring platform activity</li>
              <li style="margin-bottom: 8px;">Overseeing recruitment workflows</li>
              <li style="margin-bottom: 8px;">Managing system configurations</li>
              <li style="margin-bottom: 0;">Reviewing user registrations and data</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">As a Super Admin, you play a critical role in maintaining platform integrity and operational efficiency.</p>
          <p style="font-size: 16px;">Please ensure your login credentials remain secure and confidential.</p>
          <p style="font-size: 16px;">If you require any technical assistance, please contact the system support team.</p>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 16px; color: #64748b;">Best regards,</p>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0284c7;">HireHelp Team</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your HireHelp Super Admin Account Created',
      html: emailHtml,
      attachments: this.getCommonAttachments()
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Super Admin welcome email sent to ${email}`);
    } catch (error) {
      console.error('Error sending super admin welcome email:', error);
    }
  }
  async sendCompanyRegistrationReceivedEmail(adminEmail: string, adminName: string, companyName: string): Promise<void> {
    const trimmedEmail = adminEmail.trim();
    console.log(`[EMAIL_DEBUG] Preparing registration received email for: ${trimmedEmail}`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        ${this.getEmailHeader()}
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px;">Dear <strong>${adminName}</strong>,</p>
          
          <p style="font-size: 16px;">Thank you for registering your company, <strong>${companyName}</strong>, with HireHelp!</p>
          
          <p style="font-size: 16px;">We have successfully received your company registration details. Your account is currently under review and pending verification by our team.</p>
          
          <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bae6fd;">
            <h3 style="margin-top: 0; color: #0369a1; font-size: 18px;">What happens next:</h3>
            <ul style="padding-left: 20px; font-size: 15px; color: #334155;">
              <li style="margin-bottom: 8px;">Our team will carefully review the submitted company information</li>
              <li style="margin-bottom: 8px;">The verification process ensures authenticity and platform security</li>
              <li style="margin-bottom: 8px;">Once approved, you will receive a confirmation email</li>
              <li style="margin-bottom: 0;">After verification, you will be able to post jobs and manage recruitment activities</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">Please note that this review process is part of our commitment to maintaining a trusted and professional hiring environment.</p>
          <p style="font-size: 16px;">If any additional information is required, our team will contact you directly.</p>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 16px; color: #64748b;">Best regards,</p>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0284c7;">HireHelp Team</p>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} HireHelp. All rights reserved.
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: trimmedEmail,
      subject: `Company Registration Received - ${companyName}`,
      html: emailHtml,
      attachments: this.getCommonAttachments()
    };

    try {
      console.log(`[SMTP] Attempting to send registration email to ${trimmedEmail} via ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[SMTP_SUCCESS] Registration email sent. MessageId: ${info.messageId}`);
    } catch (error) {
      console.error('[SMTP_ERROR] CRITICAL failure sending registration email:', error);
    }
  }

  async sendCompanyVerificationEmail(adminEmail: string, adminName: string, companyName: string): Promise<void> {
    const trimmedEmail = adminEmail.trim();
    console.log(`[EMAIL_DEBUG] Preparing verification email for: ${trimmedEmail}`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        ${this.getEmailHeader()}
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px;">Dear <strong>${adminName}</strong>,</p>
          
          <p style="font-size: 16px;">Great news! Your company, <strong>${companyName}</strong>, has been successfully verified and approved by the HireHelp team.</p>
          
          <p style="font-size: 16px;">Your organization is now fully activated and ready to use all platform features.</p>
          
          <div style="background-color: #f0f9ff; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #bae6fd;">
            <h3 style="margin-top: 0; color: #0369a1; font-size: 18px;">You can now:</h3>
            <ul style="padding-left: 20px; font-size: 15px; color: #334155;">
              <li style="margin-bottom: 8px;">Post and manage job openings</li>
              <li style="margin-bottom: 8px;">Create interview rounds (Technical, HR, etc.)</li>
              <li style="margin-bottom: 8px;">Schedule interviews and assign interviewers</li>
              <li style="margin-bottom: 8px;">Invite team members to collaborate</li>
              <li style="margin-bottom: 0;">Track applications through your dashboard</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">We’re excited to have <strong>${companyName}</strong> as a verified partner on HireHelp.</p>
          <p style="font-size: 16px;">If you need any help getting started, our support team is available at <a href="mailto:hirehelp23@gmail.com" style="color: #0284c7; text-decoration: none; font-weight: bold;">hirehelp23@gmail.com</a>.</p>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 16px; color: #64748b;">Welcome aboard,</p>
            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0284c7;">HireHelp Team</p>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} HireHelp. All rights reserved.
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: trimmedEmail,
      subject: `Success! ${companyName} has been verified on HireHelp`,
      html: emailHtml,
      attachments: this.getCommonAttachments()
    };

    try {
      console.log(`[SMTP] Attempting to send verification email to ${trimmedEmail}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[SMTP_SUCCESS] Verification email sent. MessageId: ${info.messageId}`);
    } catch (error) {
      console.error('[SMTP_ERROR] CRITICAL failure sending verification email:', error);
    }
  }
}
