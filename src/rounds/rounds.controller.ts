import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { UpdateRoundDto } from './dto/update-round.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('rounds')
@Controller('rounds')
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new round' })
  @ApiResponse({ status: 201, description: 'Round created successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  create(@Body() createRoundDto: CreateRoundDto) {
    return this.roundsService.create(createRoundDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rounds' })
  @ApiResponse({ status: 200, description: 'Rounds retrieved successfully' })
  findAll() {
    return this.roundsService.findAll();
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get rounds by job ID' })
  @ApiResponse({ status: 200, description: 'Rounds retrieved successfully' })
  findByJob(@Param('jobId') jobId: string) {
    return this.roundsService.findByJob(jobId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a round by ID' })
  @ApiResponse({ status: 200, description: 'Round retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.roundsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a round' })
  @ApiResponse({ status: 200, description: 'Round updated successfully' })
  update(@Param('id') id: string, @Body() updateRoundDto: UpdateRoundDto) {
    return this.roundsService.update(id, updateRoundDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a round' })
  @ApiResponse({ status: 200, description: 'Round deleted successfully' })
  remove(@Param('id') id: string) {
    return this.roundsService.remove(id);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Archive a round' })
  @ApiResponse({ status: 200, description: 'Round archived successfully' })
  archive(@Param('id') id: string) {
    return this.roundsService.archive(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Activate a round' })
  @ApiResponse({ status: 200, description: 'Round activated successfully' })
  activate(@Param('id') id: string) {
    return this.roundsService.activate(id);
  }
}
