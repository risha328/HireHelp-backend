import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured companies' })
  @ApiResponse({ status: 200, description: 'Featured companies retrieved successfully' })
  findFeatured() {
    return this.companiesService.findFeatured();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('my-company')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user\'s company' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getMyCompany(@Req() req: any) {
    const userId = req.user.userId;
    console.log('getMyCompany called with userId:', userId);
    const company = await this.companiesService.getMyCompany(userId);
    if (!company) {
      console.log('No company found for userId:', userId);
      return { message: 'No company found for this user', company: null };
    }
    console.log('Company found:', company.name);
    return { company };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a company' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a company' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Get(':id/admins')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all admins for a company' })
  @ApiResponse({ status: 200, description: 'Company admins retrieved successfully' })
  getCompanyAdmins(@Param('id') id: string) {
    return this.companiesService.getCompanyAdmins(id);
  }

  @Post(':id/invite')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Invite a member to the company' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  inviteMember(@Param('id') id: string, @Body() inviteMemberDto: InviteMemberDto) {
    return this.companiesService.inviteMember(id, inviteMemberDto.email, inviteMemberDto.name, inviteMemberDto.role);
  }

  @Post('upload-logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: './uploads/logos',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `${(req as any).user.userId}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
        return callback(new BadRequestException('Only PNG and JPG files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
  }))
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const logoUrl = `/uploads/logos/${file.filename}`;

    return {
      message: 'Logo uploaded successfully',
      logoUrl,
      filename: file.filename,
    };
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify a company (Admin only)' })
  @ApiResponse({ status: 200, description: 'Company verified successfully' })
  verifyCompany(@Param('id') id: string) {
    return this.companiesService.verifyCompany(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reject a company (Admin only)' })
  @ApiResponse({ status: 200, description: 'Company rejected successfully' })
  rejectCompany(@Param('id') id: string) {
    return this.companiesService.rejectCompany(id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a member from the company' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.companiesService.removeMember(id, memberId);
  }
}
