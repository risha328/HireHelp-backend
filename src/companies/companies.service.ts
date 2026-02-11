import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User, UserDocument, Role } from '../users/user.schema';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) { }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    try {
      const createdCompany = new this.companyModel(createCompanyDto);
      const savedCompany = await createdCompany.save();

      // Update the user's companyId
      await this.userModel.findByIdAndUpdate(createCompanyDto.ownerId, {
        companyId: savedCompany._id.toString(),
      });

      return savedCompany;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.find().exec();
  }

  async findOne(id: string): Promise<Company | null> {
    return this.companyModel.findById(id).exec();
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company | null> {
    return this.companyModel.findByIdAndUpdate(id, updateCompanyDto, { new: true }).exec();
  }

  async remove(id: string): Promise<Company | null> {
    return this.companyModel.findByIdAndDelete(id).exec();
  }

  async findByOwnerId(ownerId: string): Promise<Company | null> {
    return this.companyModel.findOne({ ownerId }).exec();
  }

  async getMyCompany(userId: string): Promise<Company | null> {
    // First try to find by ownerId
    let company = await this.companyModel.findOne({ ownerId: userId }).exec();

    // If not found, check if user has companyId and find by that
    if (!company) {
      const user = await this.userModel.findById(userId).exec();
      if (user && user.companyId) {
        company = await this.companyModel.findById(user.companyId).exec();
      }
    }

    // If still not found, try to find any company owned by this user and update user record
    if (!company) {
      company = await this.companyModel.findOne({ ownerId: userId }).exec();
      if (company) {
        await this.userModel.findByIdAndUpdate(userId, { companyId: company._id.toString() });
      }
    }

    return company;
  }

  async verifyCompany(id: string): Promise<Company | null> {
    return this.companyModel.findByIdAndUpdate(
      id,
      { verificationStatus: 'verified' },
      { new: true },
    ).exec();
  }

  async rejectCompany(id: string): Promise<Company | null> {
    return this.companyModel.findByIdAndUpdate(
      id,
      { verificationStatus: 'rejected' },
      { new: true },
    ).exec();
  }

  async getCompanyAdmins(companyId: string): Promise<User[]> {
    return this.userModel.find({
      companyId: companyId,
      role: { $in: [Role.COMPANY_ADMIN, Role.INTERVIEWER] }
    }).exec();
  }

  async inviteMember(companyId: string, email: string, name: string, role: Role): Promise<User> {
    // 1. Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // 2. Generate random password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Create user
    const newUser = new this.userModel({
      name,
      email,
      password: hashedPassword,
      role,
      companyId,
      emailVerified: true, // Auto-verify invited members
      dateOfBirth: new Date(), // Placeholder
    });

    const savedUser = await newUser.save();

    // 4. Send email
    const company = await this.companyModel.findById(companyId);
    await this.emailService.sendInvitationEmail(
      email,
      name,
      role,
      company ? company.name : 'your company',
      '' // No password needed for email
    );

    return savedUser;
  }
}
