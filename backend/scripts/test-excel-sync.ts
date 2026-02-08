
import { excelService } from '../src/services/excel.service';
import prisma from '../src/config/database';

async function testSync() {
    try {
        console.log('Starting Excel Sync Test...');

        // Find existing schedule or create dummy one
        const today = new Date();

        // For testing, let's just sync the current week
        await excelService.syncWeekToExcel(today);

        console.log('Sync completed successfully.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSync();
