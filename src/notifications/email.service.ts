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

  async sendCodingTestEmail(candidateEmail: string, candidateName: string, jobTitle: string, companyName: string, platformName: string, duration: string, instructions: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: candidateEmail,
      subject: `Coding Test Invitation - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
          <p>Hi ${candidateName},</p>
          <p>Thank you for taking the time to complete the MCQ assessment for the <strong>${jobTitle}</strong> role.</p>
          <p>After careful evaluation, we regret to inform you that you have not been shortlisted for the next round at this time.</p>
          <p>We truly appreciate your interest in <strong>${companyName}</strong> and encourage you to apply again in the future.</p>
          <p>Wishing you success ahead.</p>
          
          <p>Regards,</p>
          <p>${companyName} Hiring Team</p>
        </div>
      `,
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
            <li style="margin-bottom: 8px;">• <strong>Experience:</strong> ${experience}</li>
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
            <li style="margin-bottom: 8px;">• <strong>Experience:</strong> ${experience}</li>
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
            <li style="margin-bottom: 8px;">• <strong>Experience:</strong> ${experience}</li>
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
}
