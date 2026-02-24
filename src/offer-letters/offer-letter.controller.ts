import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.schema';
import { OfferLetterService } from './offer-letter.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@ApiTags('offer-letters')
@Controller('applications')
@UseGuards(JwtAuthGuard)
export class OfferLetterController {
  constructor(private readonly offerLetterService: OfferLetterService) {}

  @Get(':applicationId/offer-preview')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get offer preview data for an application (company admin)' })
  @ApiResponse({ status: 200, description: 'Offer preview data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  getOfferPreview(@Param('applicationId') applicationId: string, @Req() req: any) {
    const companyId = req.user.companyId?.toString?.() || String(req.user.companyId);
    return this.offerLetterService.prepareOfferData(applicationId, companyId);
  }

  @Post(':applicationId/send-offer')
  @Roles(Role.COMPANY_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Send offer letter (generate PDF, upload, email)' })
  @ApiResponse({ status: 200, description: 'Offer sent successfully' })
  @ApiResponse({ status: 400, description: 'Offer already sent or invalid state' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  sendOffer(
    @Param('applicationId') applicationId: string,
    @Body() body: CreateOfferDto,
    @Req() req: any,
  ) {
    const companyId = req.user.companyId?.toString?.() || String(req.user.companyId);
    return this.offerLetterService.sendOffer(applicationId, body, companyId);
  }

  @Post(':applicationId/offer/accept')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Candidate accepts the offer' })
  @ApiResponse({ status: 200, description: 'Offer accepted' })
  @ApiResponse({ status: 400, description: 'Already responded or no offer' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  acceptOffer(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.offerLetterService.acceptOffer(applicationId, req.user.userId);
  }

  @Post(':applicationId/offer/decline')
  @Roles(Role.CANDIDATE)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Candidate declines the offer' })
  @ApiResponse({ status: 200, description: 'Offer declined' })
  @ApiResponse({ status: 400, description: 'Already responded or no offer' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  declineOffer(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.offerLetterService.declineOffer(applicationId, req.user.userId);
  }
}
