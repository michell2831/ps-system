import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSlaRuleDto } from './dto/create-sla-rule.dto';
import { WorkScheduleType } from './enums';

async function testBounds() {
  const boundaries = [0, 1, 99, 100];

  for (const val of boundaries) {
    const dto = plainToInstance(CreateSlaRuleDto, {
      work_schedule_type: WorkScheduleType.WEEKDAYS,
      work_start_time: '08:00',
      work_end_time: '17:00',
      warn_threshold_pct: val,
      overdue_threshold_pct: 100
    });

    const errors = await validate(dto);
    const warnErrors = errors.find(e => e.property === 'warn_threshold_pct');
    
    if (warnErrors) {
      console.log(`Testing warn_threshold_pct = ${val}: FAILED (${Object.values(warnErrors.constraints || {}).join(', ')})`);
    } else {
      console.log(`Testing warn_threshold_pct = ${val}: PASSED (Valid)`);
    }
  }
}

testBounds();
