/**
 * Context Service - Chuẩn bị dữ liệu từ database cho AI
 * AI sẽ có thông tin thực tế để trả lời chính xác hơn
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Lấy thông tin về lịch công tác hôm nay
 */
export async function getTodayScheduleContext(): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { in: ['approved', 'pending'] },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    if (schedules.length === 0) {
      return '';
    }

    let context = 'Dữ liệu lịch công tác hôm nay:\n\n';
    schedules.forEach((schedule, index) => {
      context += `${index + 1}. ${schedule.startTime} - ${schedule.endTime}\n`;
      context += `   📝 ${schedule.content}\n`;
      context += `   📍 ${schedule.location}\n`;
      context += `   👤 Chủ trì: ${schedule.leader}\n\n`;
    });

    return context;
  } catch (error) {
    console.error('[Context] Error fetching schedule:', error);
    return '';
  }
}

/**
 * Lấy thông tin về các lãnh đạo
 */
export async function getLeadersContext(): Promise<string> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['admin', 'bgh'] },
      },
      select: {
        name: true,
        position: true,
        department: true,
      },
    });

    if (users.length === 0) {
      return '';
    }

    let context = 'Danh sách lãnh đạo:\n\n';
    users.forEach((user, index) => {
      context += `${index + 1}. ${user.name}\n`;
      context += `   🎓 Chức vụ: ${user.position}\n`;
      if (user.department) {
        context += `   🏫 Đơn vị: ${user.department}\n`;
      }
      context += '\n';
    });

    return context;
  } catch (error) {
    console.error('[Context] Error fetching leaders:', error);
    return '';
  }
}

/**
 * Xây context đầy đủ cho AI
 */
export async function buildAIContext(): Promise<string> {
  try {
    // Parallel fetch để tối ưu tốc độ
    const [scheduleContext, leadersContext] = await Promise.all([
      getTodayScheduleContext(),
      getLeadersContext(),
    ]);

    let fullContext = 'THÔNG TIN BỔ SUNG CHO AI:\n\n';

    if (scheduleContext) {
      fullContext += scheduleContext + '\n\n';
    }

    if (leadersContext) {
      fullContext += leadersContext + '\n\n';
    }

    // Thêm hướng dẫn
    fullContext += `
QUY TRÌNH CHO AI:
1. Dùng thông tin trên để trả lời câu hỏi về lịch công tác
2. Nếu hỏi về thông tin trường (địa chỉ, các ngành, KTX, học phí, tuyển sinh, điểm chuẩn), sử dụng thông tin trong SYSTEM_PROMPT đã có
3. Nếu không có thông tin cụ thể, nói "Theo dữ liệu hệ thống, không có thông tin chi tiết vào lúc này. Vui lòng kiểm tra lại sau."
4. KHÔNG tự tạo lịch công tác hay thông tin mới nếu không có trong dữ liệu
5. Nếu câu hỏi không liên quan, gợi ý hỏi về: lịch công tác, thông tin trường

LƯU Ý:
- Dữ liệu được lấy từ database thời điểm thực
- Cập nhật theo thời gian thực khi người dùng hỏi
`;

    return fullContext;
  } catch (error) {
    console.error('[Context] Error building AI context:', error);
    return 'Lỗi khi xây dựng context. Vui lòng thử lại.';
  }
}
