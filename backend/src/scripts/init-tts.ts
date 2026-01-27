/**
 * Script khởi tạo âm thanh cho toàn bộ lịch công tác
 * Chạy lệnh: npx ts-node src/scripts/init-tts.ts
 */
import prisma from '../config/database';
import { ttsService } from '../services/tts.service';

async function main() {
    console.log('🚀 BẮT ĐẦU KHỞI TẠO ÂM THANH CHO TOÀN BỘ LỊCH...');

    // 1. Lấy tất cả lịch (để test khởi tạo, không lọc status)
    const schedules = await prisma.schedule.findMany({
        orderBy: { date: 'desc' }
    });

    if (schedules.length === 0) {
        console.log('❌ Không tìm thấy lịch nào đã duyệt để xử lý.');
        return;
    }

    console.log(`📋 Tìm thấy ${schedules.length} lịch. Bắt đầu gửi yêu cầu cho AI...`);
    console.log('⚠️ Lưu ý: Quá trình này có thể mất vài phút tùy vào số lượng lịch và sức mạnh của GPU.');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];
        const progress = `[${i + 1}/${schedules.length}]`;

        console.log(`${progress} Đang xử lý lịch ID: ${schedule.id} - Ngày: ${schedule.date.toLocaleDateString()}`);

        try {
            // Gọi service tạo cả 2 giọng Nam và Nữ
            const results = await ttsService.generateAllVoices(schedule);

            if (results.male.success && results.female.success) {
                successCount++;
                console.log(`   ✅ Thành công!`);
            } else {
                errorCount++;
                console.log(`   ⚠️ Lỗi một phần: Nam(${results.male.success}) - Nữ(${results.female.success})`);
            }
        } catch (err: any) {
            errorCount++;
            console.log(`   ❌ Lỗi nghiêm trọng: ${err.message}`);
        }

        // Nghỉ 1 chút giữa các yêu cầu để tránh quá tải VRAM card 6GB
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n====================================================');
    console.log('🏁 HOÀN THÀNH QUÁ TRÌNH KHỞI TẠO');
    console.log(`✨ Thành công: ${successCount}`);
    console.log(`❌ Thất bại: ${errorCount}`);
    console.log('====================================================');
}

main()
    .catch(e => {
        console.error('❌ Lỗi script:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
