import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PhHolidayService } from './ph-holiday.service';

@Injectable()
export class HolidaySeederService implements OnApplicationBootstrap {
    private readonly logger = new Logger(HolidaySeederService.name);

    constructor(private readonly phHolidayService: PhHolidayService) { }

    async onApplicationBootstrap(): Promise<void> {
        const currentYear = new Date().getFullYear();

        this.logger.log(`Starting holiday auto-sync for year ${currentYear}...`);

        try {
            const result = await this.phHolidayService.syncPhHolidays(currentYear);
            this.logger.log(
                `${currentYear} - synced: ${result.synced}, skipped: ${result.skipped}`,
            );
        } catch (err) {
            this.logger.error(`Holiday sync failed for ${currentYear}`, String(err));
        }
    }
}

