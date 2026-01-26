import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const { name, email, password, confirmPassword, dateOfBirth, role } = registerDto;

    if (password !== confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new this.userModel({
      name,
      email,
      password: hashedPassword,
      dateOfBirth,
      role,
      emailVerified: false, // Placeholder for email verification
    });

    await user.save();

    const payload = { email: user.email, sub: user._id.toString(), role: user.role };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      access_token,
      refresh_token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user._id.toString(), role: user.role };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      access_token,
      refresh_token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      const newPayload = { email: user.email, sub: user._id.toString(), role: user.role };
      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async logout(): Promise<{ message: string }> {
    // In a real implementation, you might want to blacklist the token
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
