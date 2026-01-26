import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly usersService: UsersService) {}

  @Post('upload-resume')
  @UseInterceptors(FileInterceptor('resume', {
    storage: diskStorage({
      destination: './uploads/resumes',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${(req as any).user.userId}-${uniqueSuffix}${ext}`);
      },
    }),
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

    const resumeUrl = `/uploads/resumes/${file.filename}`;
    await this.usersService.updateResumeUrl(req.user.userId, resumeUrl);

    return {
      message: 'Resume uploaded successfully',
      resumeUrl,
      filename: file.filename,
    };
  }
}
