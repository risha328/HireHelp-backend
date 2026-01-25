import { IsEmail, IsNotEmpty, IsString, IsDateString, IsEnum, MinLength, Matches } from 'class-validator';
import { Role } from '../../users/user.schema';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Role)
  role: Role;
}
