import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { HolidayType } from '../enums';

@Unique('uq_holiday_month_day_year_name', ['month', 'day', 'year', 'name'])
@Entity('holiday')
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'smallint' })
  day: number;

  @Column({ type: 'smallint', nullable: true })
  year: number | null;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: HolidayType })
  type: HolidayType;

  @Column({ default: false })
  is_recurring: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}