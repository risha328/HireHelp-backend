import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { CreateOfferDto } from './dto/create-offer.dto';

export interface OfferPdfPayload extends CreateOfferDto {
  companyName: string;
  jobTitle: string;
  candidateName: string;
}

@Injectable()
export class PdfGeneratorService {
  /**
   * Generates a professional offer letter PDF from offer data.
   * Returns a Buffer suitable for upload to Cloudinary.
   */
  async generateOfferLetterPdf(payload: OfferPdfPayload): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 72 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const {
        companyName,
        jobTitle,
        candidateName,
        position,
        salary,
        startDate,
        expiryDate,
        terms,
      } = payload;

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text(companyName, { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text('Offer Letter', { align: 'left' });
      doc.moveDown(2);

      // Date
      doc.fontSize(10).font('Helvetica').text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'left' });
      doc.moveDown(1.5);

      // Candidate
      doc.fontSize(11).font('Helvetica').text(`Dear ${candidateName},`, { align: 'left' });
      doc.moveDown(1);

      doc.font('Helvetica').text(
        `We are pleased to extend an offer of employment for the position of ${position} (${jobTitle}) at ${companyName}.`,
        { align: 'left', width: 450 }
      );
      doc.moveDown(1.5);

      // Details section
      doc.font('Helvetica-Bold').text('Offer details', { align: 'left' });
      doc.moveDown(0.5);
      doc.font('Helvetica')
        .text(`Position: ${position}`, { align: 'left' })
        .text(`Compensation: ${salary}`, { align: 'left' })
        .text(`Start date: ${startDate}`, { align: 'left' });
      if (expiryDate) {
        doc.text(`Offer valid until: ${expiryDate}`, { align: 'left' });
      }
      doc.moveDown(1.5);

      if (terms && terms.trim()) {
        doc.font('Helvetica-Bold').text('Terms and conditions', { align: 'left' });
        doc.moveDown(0.5);
        doc.font('Helvetica').text(terms, { align: 'left', width: 450 });
        doc.moveDown(1.5);
      }

      doc.font('Helvetica').text(
        'Please log in to your HireHelp candidate dashboard to accept or decline this offer.',
        { align: 'left', width: 450 }
      );
      doc.moveDown(2);

      doc.font('Helvetica').text('Sincerely,', { align: 'left' });
      doc.text('Hiring Team', { align: 'left' });
      doc.text(companyName, { align: 'left' });

      doc.end();
    });
  }
}
