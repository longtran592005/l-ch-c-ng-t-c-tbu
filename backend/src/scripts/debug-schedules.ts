import prisma from '../config/database';

async function checkSchedules() {
    const counts = await prisma.schedule.groupBy({
        by: ['status'],
        _count: {
            _all: true
        }
    });
    console.log('Phân bổ trạng thái lịch:', JSON.stringify(counts, null, 2));

    const total = await prisma.schedule.count();
    console.log('Tổng số lịch:', total);

    if (total > 0) {
        const sample = await prisma.schedule.findFirst();
        console.log('Mẫu 1 bản ghi:', JSON.stringify(sample, null, 2));
    }
}

checkSchedules()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
