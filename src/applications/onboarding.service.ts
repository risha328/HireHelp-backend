import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument } from './application.schema';
import {
  OnboardingDocument,
  OnboardingDocumentDocument,
  OnboardingDocumentType,
  OnboardingDocumentStatus,
} from './onboarding-document.schema';

export const ONBOARDING_PHASE = {
  PRE_JOINING: 'PRE_JOINING',
  READY_TO_JOIN: 'READY_TO_JOIN',
  CONVERTED: 'CONVERTED',
} as const;
export type OnboardingPhase = (typeof ONBOARDING_PHASE)[keyof typeof ONBOARDING_PHASE];

export const BACKGROUND_VERIFICATION_STATUS = {
  NOT_INITIATED: 'NOT_INITIATED',
  IN_PROGRESS: 'IN_PROGRESS',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
} as const;

const DEFAULT_DOCUMENT_TYPES = [
  OnboardingDocumentType.GOVERNMENT_ID,
  OnboardingDocumentType.ADDRESS_PROOF,
  OnboardingDocumentType.ACADEMIC_CERTIFICATES,
  OnboardingDocumentType.RESUME,
  OnboardingDocumentType.PHOTO,
];

const WEIGHT_OFFER_ACCEPTED = 20;
const WEIGHT_DOCUMENTS_UPLOADED = 30;
const WEIGHT_DOCUMENTS_APPROVED = 20;
const WEIGHT_BACKGROUND_COMPLETED = 20;
const WEIGHT_HR_FINAL_APPROVAL = 10;

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(OnboardingDocument.name) private onboardingDocumentModel: Model<OnboardingDocumentDocument>,
  ) {}

  /** Create default document checklist for an application (call after offer accept). */
  async createDefaultChecklist(applicationId: string): Promise<OnboardingDocument[]> {
    const app = await this.applicationModel.findById(applicationId).exec();
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    const existing = await this.onboardingDocumentModel.countDocuments({ applicationId: new Types.ObjectId(applicationId) }).exec();
    if (existing > 0) {
      return this.onboardingDocumentModel.find({ applicationId: new Types.ObjectId(applicationId) }).exec();
    }
    const docs = DEFAULT_DOCUMENT_TYPES.map((documentType) => ({
      applicationId: new Types.ObjectId(applicationId),
      documentType,
      status: OnboardingDocumentStatus.NOT_UPLOADED,
    }));
    const created = await this.onboardingDocumentModel.insertMany(docs);
    return created;
  }

  /** Recompute documentStatus on Application from checklist (all APPROVED => completed). */
  async recomputeDocumentStatus(applicationId: string): Promise<'pending' | 'completed'> {
    const items = await this.onboardingDocumentModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .exec();
    if (items.length === 0) {
      return 'pending';
    }
    const allApproved = items.every((i) => i.status === OnboardingDocumentStatus.APPROVED);
    const documentStatus = allApproved ? 'completed' : 'pending';
    await this.applicationModel
      .findByIdAndUpdate(applicationId, { documentStatus }, { new: true })
      .exec();
    return documentStatus;
  }

  /** When documentStatus becomes completed, optionally set background to IN_PROGRESS. */
  async maybeStartBackgroundVerification(applicationId: string): Promise<void> {
    const app = await this.applicationModel.findById(applicationId).exec();
    if (!app) return;
    const current = (app as any).backgroundVerificationStatus;
    if (current === BACKGROUND_VERIFICATION_STATUS.NOT_INITIATED || !current || current === 'pending') {
      await this.applicationModel
        .findByIdAndUpdate(applicationId, {
          backgroundVerificationStatus: BACKGROUND_VERIFICATION_STATUS.IN_PROGRESS,
        })
        .exec();
    }
  }

  /** Recompute onboarding progress (0–100) from steps and persist. */
  async recomputeOnboardingProgress(applicationId: string): Promise<number> {
    const app = await this.applicationModel.findById(applicationId).exec();
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    const items = await this.onboardingDocumentModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .exec();
    const offerAccepted = (app as any).offerAccepted === true;
    const allUploaded = items.length > 0 && items.every((i) => i.status !== OnboardingDocumentStatus.NOT_UPLOADED);
    const documentsApproved = (app as any).documentStatus === 'completed';
    const bgVerified = (app as any).backgroundVerificationStatus === BACKGROUND_VERIFICATION_STATUS.VERIFIED;
    const hrApproved = (app as any).convertedToEmployee === true;

    let progress = 0;
    if (offerAccepted) progress += WEIGHT_OFFER_ACCEPTED;
    if (allUploaded) progress += WEIGHT_DOCUMENTS_UPLOADED;
    if (documentsApproved) progress += WEIGHT_DOCUMENTS_APPROVED;
    if (bgVerified) progress += WEIGHT_BACKGROUND_COMPLETED;
    if (hrApproved) progress += WEIGHT_HR_FINAL_APPROVAL;

    await this.applicationModel
      .findByIdAndUpdate(applicationId, { onboardingProgress: progress }, { new: true })
      .exec();
    return progress;
  }

  /** Derived phase from application (and optionally documentStatus / backgroundVerificationStatus). */
  getOnboardingPhase(application: ApplicationDocument | any): OnboardingPhase {
    if (application.convertedToEmployee === true) {
      return ONBOARDING_PHASE.CONVERTED;
    }
    const docStatus = application.documentStatus === 'completed';
    const bgStatus = application.backgroundVerificationStatus === BACKGROUND_VERIFICATION_STATUS.VERIFIED;
    if (docStatus && bgStatus) {
      return ONBOARDING_PHASE.READY_TO_JOIN;
    }
    return ONBOARDING_PHASE.PRE_JOINING;
  }

  /** Get checklist for an application. If offer was already accepted but no checklist exists (e.g. accepted before feature), create it on first access. */
  async getChecklist(applicationId: string): Promise<OnboardingDocument[]> {
    const items = await this.onboardingDocumentModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .sort({ documentType: 1 })
      .exec();
    if (items.length === 0) {
      const app = await this.applicationModel.findById(applicationId).exec();
      if (app && (app as any).offerAccepted === true) {
        await this.createDefaultChecklist(applicationId);
        await this.recomputeOnboardingProgress(applicationId);
        return this.onboardingDocumentModel
          .find({ applicationId: new Types.ObjectId(applicationId) })
          .sort({ documentType: 1 })
          .exec();
      }
    }
    return items;
  }

  /** Check all docs uploaded (for progress). */
  async areAllDocumentsUploaded(applicationId: string): Promise<boolean> {
    const items = await this.onboardingDocumentModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .exec();
    return items.length > 0 && items.every((i) => i.status !== OnboardingDocumentStatus.NOT_UPLOADED);
  }

  /** Candidate uploads a document: set fileUrl, status UPLOADED, then recompute. */
  async uploadDocument(applicationId: string, documentId: string, fileUrl: string): Promise<OnboardingDocument> {
    const doc = await this.onboardingDocumentModel
      .findOne({ _id: new Types.ObjectId(documentId), applicationId: new Types.ObjectId(applicationId) })
      .exec();
    if (!doc) {
      throw new NotFoundException('Onboarding document not found');
    }
    doc.fileUrl = fileUrl;
    doc.status = OnboardingDocumentStatus.UPLOADED;
    doc.uploadedAt = new Date();
    await doc.save();
    await this.recomputeDocumentStatus(applicationId);
    await this.recomputeOnboardingProgress(applicationId);
    return doc;
  }

  /** Company admin reviews a document: APPROVED or REJECTED; then recompute and maybe start BG. */
  async reviewDocument(
    applicationId: string,
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectedReason?: string,
  ): Promise<OnboardingDocument> {
    const doc = await this.onboardingDocumentModel
      .findOne({ _id: new Types.ObjectId(documentId), applicationId: new Types.ObjectId(applicationId) })
      .exec();
    if (!doc) {
      throw new NotFoundException('Onboarding document not found');
    }
    doc.status = status === 'APPROVED' ? OnboardingDocumentStatus.APPROVED : OnboardingDocumentStatus.REJECTED;
    doc.reviewedAt = new Date();
    doc.rejectedReason = status === 'REJECTED' ? rejectedReason : undefined;
    await doc.save();
    const newDocStatus = await this.recomputeDocumentStatus(applicationId);
    if (newDocStatus === 'completed') {
      await this.maybeStartBackgroundVerification(applicationId);
    }
    await this.recomputeOnboardingProgress(applicationId);
    return doc;
  }

  /** Company admin updates background verification status. */
  async updateBackgroundVerification(
    applicationId: string,
    status: string,
    notes?: string,
    failedReason?: string,
  ): Promise<Application> {
    const app = await this.applicationModel.findById(applicationId).exec();
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    (app as any).backgroundVerificationStatus = status;
    if (notes !== undefined) (app as any).backgroundVerificationNotes = notes;
    if (failedReason !== undefined) (app as any).backgroundVerificationFailedReason = failedReason;
    await app.save();
    await this.recomputeOnboardingProgress(applicationId);
    return this.applicationModel
      .findById(applicationId)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title')
      .populate('companyId', 'name')
      .exec() as Promise<Application>;
  }
}
