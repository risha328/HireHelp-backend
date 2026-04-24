import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoundDto } from './create-round.dto';
import { RoundType, MCQMode } from '../round.schema';

describe('CreateRoundDto', () => {
  it('accepts INTERNAL mcq configuration', async () => {
    const dto = plainToInstance(CreateRoundDto, {
      name: 'MCQ Round 1',
      jobId: '507f1f77bcf86cd799439011',
      type: RoundType.MCQ,
      mode: MCQMode.INTERNAL,
      questionSetId: '507f1f77bcf86cd799439012',
      durationMinutes: 60,
      autoSubmit: true,
      passPercentage: 70,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects invalid externalLink url', async () => {
    const dto = plainToInstance(CreateRoundDto, {
      name: 'External MCQ',
      jobId: '507f1f77bcf86cd799439011',
      type: RoundType.MCQ,
      mode: MCQMode.EXTERNAL,
      externalLink: 'not-a-url',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
