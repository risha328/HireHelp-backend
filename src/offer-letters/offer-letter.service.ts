import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Application, ApplicationDocument, ApplicationStatus } from '../applications/application.schema';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferPreviewData } from './dto/create-offer.dto';
import { PdfGeneratorService, OfferPdfPayload } from './pdf-generator.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../notifications/email.service';

const DOWNLOAD_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class OfferLetterService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private pdfGeneratorService: PdfGeneratorService,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
  ) {}

  /** Create a signed token for public offer letter download (no login required). */
  createDownloadToken(applicationId: string): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiry = Date.now() + DOWNLOAD_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const payload = `${applicationId}|${expiry}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    return `${payloadB64}.${signature}`;
  }

  /**
   * Verify token and return PDF buffer + friendly filename for streaming.
   * Used by the public download endpoint.
   */
  async getOfferLetterForDownload(token: string): Promise<{ buffer: Buffer; filename: string }> {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const parts = token.split('.');
    if (parts.length !== 2) throw new BadRequestException('Invalid download link');
    const [payloadB64, signature] = parts;
    let payload: string;
    try {
      payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid download link');
    }
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (signature !== expectedSignature) throw new BadRequestException('Invalid download link');
    const [applicationId, expiryStr] = payload.split('|');
    if (!applicationId || !expiryStr) throw new BadRequestException('Invalid download link');
    if (Date.now() > parseInt(expiryStr, 10)) throw new BadRequestException('This download link has expired');
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .populate('candidateId', 'name')
      .exec();
    if (!application || !(application as any).offerLetterUrl) {
      throw new NotFoundException('Offer letter not found');
    }
    const companyName = (application.companyId as any)?.name || 'Company';
    const jobTitle = (application.jobId as any)?.title || 'Offer';
    const candidateName = (application.candidateId as any)?.name || 'Candidate';
    const safeName = [companyName, jobTitle].map((s) => s.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')).join('-');
    const filename = `Offer-Letter-${safeName || 'Offer'}.pdf`;

    // Always regenerate PDF from stored data so we don't depend on Cloudinary fetch (which often fails from server).
    const details = (application as any).offerDetails;
    const pdfPayload: OfferPdfPayload = {
      position: details?.position ?? jobTitle,
      salary: details?.salary ?? '',
      startDate: details?.startDate ?? '',
      expiryDate: details?.expiryDate,
      terms: details?.terms,
      companyName: details?.companyName ?? companyName,
      jobTitle: details?.jobTitle ?? jobTitle,
      candidateName: details?.candidateName ?? candidateName,
    };
    const buffer = await this.pdfGeneratorService.generateOfferLetterPdf(pdfPayload);
    return { buffer, filename };
  }

  /**
   * Load application and return default offer data for company preview.
   * Company admin only; application must belong to their company.
   */
  async prepareOfferData(applicationId: string, userCompanyId: string): Promise<OfferPreviewData> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const appCompanyId = (application.companyId as any)?._id?.toString() || (application.companyId as any)?.toString();
    if (appCompanyId !== userCompanyId) {
      throw new ForbiddenException('You can only manage offers for applications of your company');
    }
    if (application.status !== ApplicationStatus.HIRED) {
      throw new BadRequestException('Application status must be HIRED to prepare an offer');
    }

    const candidateName = (application.candidateId as any)?.name || 'Candidate';
    const candidateEmail = (application.candidateId as any)?.email || '';
    const jobTitle = (application.jobId as any)?.title || '';
    const companyName = (application.companyId as any)?.name || '';

    const existing = (application as any).offerDetails;
    return {
      position: existing?.position ?? jobTitle,
      salary: existing?.salary ?? '',
      startDate: existing?.startDate ?? '',
      expiryDate: existing?.expiryDate,
      terms: existing?.terms,
      companyName,
      jobTitle,
      candidateName,
      candidateEmail,
    };
  }

  /**
   * Generate PDF, upload, save offer to application, send email.
   * Company admin only; idempotent: reject if offer already sent.
   */
  async sendOffer(applicationId: string, dto: CreateOfferDto, userCompanyId: string): Promise<Application> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const appCompanyId = (application.companyId as any)?._id?.toString() || (application.companyId as any)?.toString();
    if (appCompanyId !== userCompanyId) {
      throw new ForbiddenException('You can only send offers for applications of your company');
    }
    if (application.status !== ApplicationStatus.HIRED) {
      throw new BadRequestException('Application status must be HIRED to send an offer');
    }
    if ((application as any).offerLetterUrl) {
      throw new BadRequestException('Offer has already been sent for this application');
    }

    const candidateName = (application.candidateId as any)?.name || 'Candidate';
    const jobTitle = (application.jobId as any)?.title || '';
    const companyName = (application.companyId as any)?.name || '';

    const offerDetails = {
      position: dto.position,
      salary: dto.salary,
      startDate: dto.startDate,
      expiryDate: dto.expiryDate,
      terms: dto.terms,
      companyName,
      jobTitle,
      candidateName,
    };

    const pdfPayload: OfferPdfPayload = {
      ...dto,
      companyName,
      jobTitle,
      candidateName,
    };
    const pdfBuffer = await this.pdfGeneratorService.generateOfferLetterPdf(pdfPayload);

    const filename = `offer-${applicationId}-${Date.now()}.pdf`;
    const { secure_url } = await this.cloudinaryService.uploadBuffer(
      pdfBuffer,
      'hirehelp/offer-letters',
      { resource_type: 'raw', originalFilename: filename },
    );

    (application as any).offerDetails = offerDetails;
    (application as any).offerLetterUrl = secure_url;
    (application as any).offerSentAt = new Date();
    if (dto.startDate) {
      const joinDate = new Date(dto.startDate);
      if (!isNaN(joinDate.getTime())) (application as any).joiningDate = joinDate;
    }
    await application.save();

    const candidateEmail = (application.candidateId as any)?.email;
    if (!candidateEmail) {
      console.warn(`Offer letter saved for application ${applicationId} but candidate has no email – no offer email sent.`);
      return this.applicationModel
        .findById(applicationId)
        .populate('candidateId', 'name email phone')
        .populate('jobId', 'title')
        .populate('companyId', 'name')
        .exec() as Promise<Application>;
    }
    const downloadToken = this.createDownloadToken(applicationId);
    // Use backend URL only (download is served by this API), never frontend URL
    const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const downloadUrl = `${apiBase.replace(/\/$/, '')}/offer-letters/download?token=${encodeURIComponent(downloadToken)}`;
    const attachmentFilename = `Offer-Letter-${(companyName || 'Company').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')}-${(jobTitle || 'Offer').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-')}.pdf`;
    await this.emailService.sendOfferLetterEmail(
      candidateEmail,
      candidateName,
      jobTitle,
      companyName,
      downloadUrl,
      pdfBuffer,
      attachmentFilename,
    );

    return this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec() as Promise<Application>;
  }

  /**
   * Returns a one-time download URL for the offer letter. Candidate only; application must belong to them.
   */
  async getDownloadLinkForCandidate(applicationId: string, candidateUserId: string): Promise<{ downloadUrl: string }> {
    const application = await this.applicationModel
      .findById(applicationId)
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const appCandidateId = (application.candidateId as any)?._id?.toString() || (application.candidateId as any)?.toString();
    if (appCandidateId !== candidateUserId) {
      throw new ForbiddenException('You can only access offer letters for your own applications');
    }
    if (!(application as any).offerLetterUrl) {
      throw new NotFoundException('No offer letter has been sent for this application');
    }
    const token = this.createDownloadToken(applicationId);
    // Use backend URL only (download is served by this API), never frontend URL
    const apiBase = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const downloadUrl = `${apiBase.replace(/\/$/, '')}/offer-letters/download?token=${encodeURIComponent(token)}`;
    return { downloadUrl };
  }

  /**
   * Candidate accepts the offer.
   */
  async acceptOffer(applicationId: string, candidateUserId: string): Promise<Application> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const appCandidateId = (application.candidateId as any)?._id?.toString();
    if (appCandidateId !== candidateUserId) {
      throw new ForbiddenException('You can only respond to your own offer');
    }
    if (!(application as any).offerLetterUrl) {
      throw new BadRequestException('No offer has been sent for this application');
    }
    if ((application as any).offerAccepted !== null && (application as any).offerAccepted !== undefined) {
      throw new BadRequestException('You have already responded to this offer');
    }

    (application as any).offerAccepted = true;
    (application as any).offerAcceptedAt = new Date();
    await application.save();

    return this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec() as Promise<Application>;
  }

  /**
   * Candidate declines the offer.
   */
  async declineOffer(applicationId: string, candidateUserId: string): Promise<Application> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const appCandidateId = (application.candidateId as any)?._id?.toString();
    if (appCandidateId !== candidateUserId) {
      throw new ForbiddenException('You can only respond to your own offer');
    }
    if (!(application as any).offerLetterUrl) {
      throw new BadRequestException('No offer has been sent for this application');
    }
    if ((application as any).offerAccepted !== null && (application as any).offerAccepted !== undefined) {
      throw new BadRequestException('You have already responded to this offer');
    }

    (application as any).offerAccepted = false;
    (application as any).offerAcceptedAt = new Date();
    await application.save();

    return this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec() as Promise<Application>;
  }
}
