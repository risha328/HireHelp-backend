import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload-resume')
  @UseInterceptors(FileInterceptor('resume', {
    storage: memoryStorage(),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(pdf|docx)$/)) {
        return callback(new BadRequestException('Only PDF and DOCX files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
  }))
  async uploadResume(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { secure_url } = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'hirehelp/resumes',
      { resource_type: 'raw', originalFilename: file.originalname },
    );
    await this.usersService.updateResumeUrl(req.user.userId, secure_url);

    return {
      message: 'Resume uploaded successfully',
      resumeUrl: secure_url,
      filename: file.originalname,
    };
  }
}
