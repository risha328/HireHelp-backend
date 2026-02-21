import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadBufferOptions {
  resource_type?: 'image' | 'raw' | 'auto';
  /** Original filename (e.g. "resume.pdf") so the Cloudinary URL includes extension for correct browser opening */
  originalFilename?: string;
}

@Injectable()
export class CloudinaryService {
  constructor() {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    options?: UploadBufferOptions,
  ): Promise<{ secure_url: string; public_id?: string }> {
    const resourceType = options?.resource_type ?? 'auto';
    // Include extension in public_id so the delivered URL works for viewing PDFs etc. in browser
    const publicId = options?.originalFilename
      ? `${folder}/${Date.now()}-${options.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      : undefined;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          ...(publicId && { public_id: publicId }),
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('No secure_url in Cloudinary response'));
            return;
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );
      uploadStream.end(buffer);
    });
  }
}
