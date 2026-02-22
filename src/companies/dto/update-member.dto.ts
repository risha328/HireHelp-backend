import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '../../users/user.schema';

export class UpdateMemberDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}

/** For PUT /companies/members/update - companyId and memberId in body */
export class UpdateMemberBodyDto extends UpdateMemberDto {
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @IsNotEmpty()
    @IsString()
    memberId: string;
}
