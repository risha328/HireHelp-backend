import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    console.log('JwtStrategy initialized with secret:', jwtSecret.substring(0, 10) + '...');
  }

  async validate(payload: any) {
    try {
      console.log('JWT Validation - payload:', payload);
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        console.log('User not found for ID:', payload.sub);
        throw new UnauthorizedException('User not found');
      }
      console.log('User validated successfully:', user.email);
      return {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        companyId: user.companyId
      };
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
