/**
 * Module định dạng câu trả lời cho chatbot
 * Tạo câu trả lời theo văn phong hành chính
 * 
 * @author Trường Đại học Thái Bình
 */

import { Schedule } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ExtractedIntent } from './intentExtractor';
import { QueryResult } from './scheduleQuery';

// ========================
// CONSTANTS - Mẫu câu trả lời
// ========================

/**
 * Câu chào mừng
 */
export const GREETING_RESPONSE = `Xin chào! 👋

Tôi là **Trợ lý TBU** - hệ thống tra cứu lịch công tác của Trường Đại học Thái Bình.

Tôi có thể giúp bạn:
• Xem lịch công tác hôm nay / tuần này
• Tra cứu lịch theo ngày (VD: 15/12)
• Tra cứu lịch theo lãnh đạo
• Tra cứu lịch theo buổi sáng/chiều

Hãy đặt câu hỏi để bắt đầu!`;

/**
 * Hướng dẫn sử dụng
 */
export const HELP_RESPONSE = `📋 **Hướng dẫn sử dụng Trợ lý TBU**

Bạn có thể hỏi theo các cách sau:

**Theo thời gian:**
• "Lịch công tác hôm nay"
• "Lịch ngày mai"
• "Lịch tuần này"
• "Lịch ngày 15/12"
• "Thứ 5 có lịch gì?"

**Theo buổi:**
• "Sáng nay có lịch gì?"
• "Chiều thứ 4 có họp không?"

**Theo lãnh đạo:**
• "Hiệu trưởng hôm nay làm gì?"
• "Lịch của Phó Hiệu trưởng"

**Câu hỏi tiếp theo:**
Sau khi hỏi, bạn có thể hỏi thêm "Còn gì nữa?" hoặc "Buổi chiều thì sao?"`;

/**
 * Câu cảm ơn
 */
export const THANKS_RESPONSE = `Rất vui được hỗ trợ bạn! 😊

Nếu cần tra cứu thêm thông tin về lịch công tác, đừng ngại hỏi tôi nhé.`;

/**
 * Trả lời về tin tức
 */
export const NEWS_RESPONSE = `📰 **Tin tức mới nhất**

Bạn có thể xem tin tức mới nhất của trường tại:
• **Menu Tin tức** trên website
• Hoặc truy cập: [Tin tức TBU](/tin-tuc)

Tôi có thể giúp bạn tìm tin tức cụ thể nếu bạn cho tôi từ khóa! Ví dụ:
• "Tin về tuyển sinh"
• "Tin sự kiện"
• "Tin nghiên cứu khoa học"`;

/**
 * Trả lời về thông báo
 */
export const ANNOUNCEMENTS_RESPONSE = `📢 **Thông báo mới nhất**

Các thông báo quan trọng được hiển thị trên:
• **Menu Thông báo** trên website  
• Hoặc truy cập: [Thông báo TBU](/thong-bao)

Bạn có thể hỏi về thông báo cụ thể, ví dụ:
• "Thông báo về thi"
• "Thông báo về lịch nghỉ"
• "Thông báo đăng ký"`;

/**
 * Thông tin liên hệ
 */
export const CONTACT_RESPONSE = `📞 **Thông tin liên hệ**

**Trường Đại học Thái Bình**
📍 Địa chỉ: [Địa chỉ cụ thể của trường]
📞 Điện thoại: [Số điện thoại]
📧 Email: contact@tbu.edu.vn

Giờ làm việc:
• Thứ 2 - Thứ 6: 8:00 - 17:00
• Thứ 7: 8:00 - 12:00

Bạn có thể trực tiếp đến trường hoặc liên hệ qua hotline để được hỗ trợ.`;

/**
 * Giới thiệu về trường
 */
export const ABOUT_RESPONSE = `🎓 **Giới thiệu trường**

Trường Đại học Thái Bình (TBU) là trường đại học công lập, đào tạo đa ngành, đóng góp vào sự phát triển kinh tế - xã hội của địa phương và khu vực.

**Vị thế:**
• Đào tạo đa ngành, đa lĩnh vực
• Đội ngũ giảng viên giàu kinh nghiệm
• Cơ sở vật chất khang trang
• Môi trường học thuật hiện đại

**Website:** [www.tbu.edu.vn](https://www.tbu.edu.vn)

Bạn có thể hỏi về:
• Các ngành đào tạo
• Học phí, điểm chuẩn
• Khuôn viên trường
• Chương trình học`;

/**
 * Chương trình đào tạo
 */
export const PROGRAMS_RESPONSE = `📚 **Chương trình đào tạo**

Trường Đại học Thái Bình đào tạo đa ngành các lĩnh vực:
• Kinh tế
• Quản trị
• Ngôn ngữ
• Công nghệ thông tin
• Cơ khí - Lý tự động hóa
• Nông nghiệp

**Để biết chi tiết:**
• Truy cập website trường: www.tbu.edu.vn
• Hoặc liên hệ Phòng Đào tạo

Bạn có thể hỏi cụ thể về:
• "Chương trình ngành kinh tế"
• "Học phí ngành nào"
• "Thời gian học ngành IT"`;

/**
 * Tuyển sinh
 */
export const ADMISSION_RESPONSE = `🎯 **Thông tin tuyển sinh**

**Phương thức xét tuyển:**
• Xét tuyển từ kết quả thi tốt nghiệp THPT
• Xét tuyển học bạ
• Xét tuyển thẳng

**Thông tin cần biết:**
• Điểm chuẩn năm nay
• Học phí các ngành
• Ngành đào tạo
• Hồ sơ cần nộp

**Liên hệ:**
• Phòng Đào tạo
• Hotline: [Số điện thoại]
• Website: www.tbu.edu.vn/tuyen-sinh

Bạn có thể hỏi:
• "Điểm chuẩn năm nay"
• "Học phí ngành kinh tế"
• "Cách nộp hồ sơ"`;

/**
 * FAQ - Câu hỏi thường gặp
 */
export const FAQ_RESPONSES: Record<string, string> = {
  'điểm': 'Điểm chuẩn hàng năm được công bố trên website trường sau khi kỳ thi THPT quốc gia kết thúc. Bạn có thể xem thông tin chi tiết tại: www.tbu.edu.vn',
  'học phí': 'Học phí được quy định theo từng năm học và từng ngành đào tạo. Để biết chi tiết học phí, bạn vui lòng liên hệ Phòng Đào tạo hoặc xem thông báo trên website.',
  'ngành': 'Trường đào tạo nhiều ngành như: Kinh tế, Quản trị, Ngôn ngữ, Công nghệ thông tin, Cơ khí, Nông nghiệp. Bạn có thể xem chi tiết từng ngành trên website trường.',
  'thời gian': 'Thời gian học cho chương trình đại học thường là 4 năm. Các chương trình khác có thể có thời gian khác, bạn vui lòng kiểm tra thông tin cụ thể trên website.',
  'đăng ký': 'Để đăng ký tuyển sinh, bạn cần chuẩn bị hồ sơ theo thông báo tuyển sinh hàng năm. Hồ sơ thường bao gồm: Bảng điểm, CCCD/CMND, hồ sơ học tập, ảnh thẻ, v.v.',
  'nhà ở': 'Nhà trường có KTX và ký túc xá cho sinh viên. Để biết chi tiết về ký túc xá, bạn vui lòng liên hệ Phòng Công tác sinh viên.',
  'thi': 'Lịch thi được thông báo trước 2 tuần. Bạn có thể xem lịch thi trên website hoặc thông báo từ Phòng Đào tạo.',
  'bảng điểm': 'Bảng điểm được cập nhật sau mỗi kỳ thi. Bạn có thể tra cứu bảng điểm online trên website trường hoặc đến Phòng Đào tạo.',
};

/**
 * Không tìm thấy lịch
 */
export const NO_SCHEDULE_RESPONSES = [
  'Không có lịch công tác nào trong thời gian này.',
  'Hiện chưa có lịch công tác được đăng ký trong khoảng thời gian bạn hỏi.',
  'Không tìm thấy lịch công tác phù hợp với yêu cầu của bạn.',
];

/**
 * Không hiểu câu hỏi
 */
export const UNKNOWN_RESPONSES = [
  `Xin lỗi, tôi chưa hiểu câu hỏi của bạn.

Bạn có thể thử hỏi:
• "Lịch công tác hôm nay"
• "Lịch tuần này"
• "Hiệu trưởng hôm nay làm gì?"`,
  
  `Tôi là chatbot tra cứu lịch công tác.

Vui lòng hỏi về lịch làm việc, ví dụ:
• "Hôm nay có lịch gì?"
• "Lịch ngày 20/12"`,
];

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Format ngày theo tiếng Việt
 */
function formatDate(date: Date): string {
  return format(date, "EEEE, 'ngày' dd/MM/yyyy", { locale: vi });
}

/**
 * Format ngày ngắn gọn
 */
function formatDateShort(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: vi });
}

/**
 * Lấy tên buổi đầy đủ
 */
function getPeriodName(period: 'sáng' | 'chiều' | 'tối'): string {
  const names = { 'sáng': 'buổi sáng', 'chiều': 'buổi chiều', 'tối': 'buổi tối' };
  return names[period] || period;
}

/**
 * Chọn ngẫu nhiên từ mảng
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ========================
// SCHEDULE FORMATTING
// ========================

/**
 * Format một lịch công tác thành text
 */
function formatSingleSchedule(schedule: Schedule, showDate: boolean = false): string {
  let text = '';
  
  if (showDate) {
    const dateStr = format(new Date(schedule.date), "EEEE, dd/MM", { locale: vi });
    text += `📌 **${dateStr}**\n`;
  }
  
  text += `⏰ **${schedule.startTime} - ${schedule.endTime}**\n`;
  text += `📝 ${schedule.content}\n`;
  text += `📍 Địa điểm: ${schedule.location}\n`;
  text += `👤 Chủ trì: ${schedule.leader}`;
  
  if (schedule.participants && schedule.participants.length > 0) {
    text += `\n👥 Thành phần: ${schedule.participants.join(', ')}`;
  }
  
  return text;
}

/**
 * Format danh sách lịch công tác
 */
function formatScheduleList(schedules: Schedule[], contextText: string, showDates: boolean = true): string {
  if (schedules.length === 0) {
    return randomChoice(NO_SCHEDULE_RESPONSES);
  }

  let response = `📅 **${contextText}** _(${schedules.length} sự kiện)_\n\n`;

  if (showDates) {
    // Nhóm theo ngày
    const groupedByDate = new Map<string, Schedule[]>();
    
    schedules.forEach(schedule => {
      const dateKey = new Date(schedule.date).toDateString();
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(schedule);
    });

    groupedByDate.forEach((daySchedules, dateKey) => {
      const date = new Date(dateKey);
      const dateStr = format(date, "EEEE, dd/MM", { locale: vi });
      
      response += `📌 **${dateStr}**\n`;
      
      daySchedules.forEach(schedule => {
        response += `\n⏰ ${schedule.startTime} - ${schedule.endTime}\n`;
        response += `📝 ${schedule.content}\n`;
        response += `📍 ${schedule.location}\n`;
        response += `👤 ${schedule.leader}\n`;
      });
      
      response += '\n---\n\n';
    });
  } else {
    // Hiển thị không nhóm theo ngày
    schedules.forEach((schedule, index) => {
      response += formatSingleSchedule(schedule, false);
      if (index < schedules.length - 1) {
        response += '\n\n---\n\n';
      }
    });
  }

  return response.trim();
}

// ========================
// MAIN FORMATTING FUNCTION
// ========================

/**
 * Tạo câu trả lời dựa trên intent và kết quả truy vấn
 * @param intent - Ý định đã trích xuất
 * @param queryResult - Kết quả truy vấn lịch
 * @returns Câu trả lời
 */
export function formatAnswer(intent: ExtractedIntent, queryResult: QueryResult): string {
  // Xử lý các intent đặc biệt
  switch (intent.type) {
    case 'greeting':
      return GREETING_RESPONSE;

    case 'help':
      return HELP_RESPONSE;

    case 'thanks':
      return THANKS_RESPONSE;

    case 'news':
      return NEWS_RESPONSE;

    case 'announcements':
      return ANNOUNCEMENTS_RESPONSE;

    case 'contact':
      return CONTACT_RESPONSE;

    case 'about':
      return ABOUT_RESPONSE;

    case 'programs':
      return PROGRAMS_RESPONSE;

    case 'admission':
      return ADMISSION_RESPONSE;

    case 'faq':
      // Tìm từ khóa trong câu hỏi
      const faqKeyword = Object.keys(FAQ_RESPONSES).find(key =>
        intent.normalizedText.includes(key)
      );
      return faqKeyword ? FAQ_RESPONSES[faqKeyword] : `Bạn có thể hỏi về: điểm chuẩn, học phí, các ngành đào tạo, đăng ký, nhà ở, thi, bảng điểm.`;

    case 'unknown':
      return randomChoice(UNKNOWN_RESPONSES);
  }

  // Xử lý các intent về lịch công tác
  const schedules = queryResult.schedules;
  let contextText = '';

  switch (intent.type) {
    case 'schedule_today':
      contextText = 'Lịch công tác hôm nay';
      if (intent.timePeriod) {
        contextText += ` ${getPeriodName(intent.timePeriod)}`;
      }
      return formatScheduleList(schedules, contextText, false);

    case 'schedule_tomorrow':
      contextText = 'Lịch công tác ngày mai';
      if (intent.timePeriod) {
        contextText += ` ${getPeriodName(intent.timePeriod)}`;
      }
      return formatScheduleList(schedules, contextText, false);

    case 'schedule_week':
      contextText = 'Lịch công tác tuần này';
      return formatScheduleList(schedules, contextText, true);

    case 'schedule_date':
      if (intent.date) {
        contextText = `Lịch công tác ngày ${formatDateShort(intent.date)}`;
        if (intent.timePeriod) {
          contextText += ` ${getPeriodName(intent.timePeriod)}`;
        }
      }
      return formatScheduleList(schedules, contextText, false);

    case 'schedule_day':
      if (intent.date) {
        const dayName = format(intent.date, 'EEEE', { locale: vi });
        contextText = `Lịch công tác ${dayName}`;
        if (intent.timePeriod) {
          contextText += ` ${getPeriodName(intent.timePeriod)}`;
        }
      }
      return formatScheduleList(schedules, contextText, false);

    case 'schedule_leader':
      if (intent.leader) {
        const leaderTitle = intent.leader.charAt(0).toUpperCase() + intent.leader.slice(1);
        contextText = `Lịch công tác của ${leaderTitle}`;
        if (intent.date) {
          contextText += ` ngày ${formatDateShort(intent.date)}`;
        }
        if (intent.timePeriod) {
          contextText += ` ${getPeriodName(intent.timePeriod)}`;
        }
      }
      return formatScheduleList(schedules, contextText, intent.date ? false : true);

    case 'schedule_period':
      if (intent.timePeriod) {
        contextText = `Lịch công tác ${getPeriodName(intent.timePeriod)} hôm nay`;
      }
      return formatScheduleList(schedules, contextText, false);

    case 'schedule_general':
    case 'followup':
      // Xây dựng context text dựa trên thông tin có
      const parts: string[] = ['Lịch công tác'];
      
      if (intent.leader) {
        parts.push(`của ${intent.leader}`);
      }
      if (intent.date) {
        parts.push(`ngày ${formatDateShort(intent.date)}`);
      }
      if (intent.timePeriod) {
        parts.push(getPeriodName(intent.timePeriod));
      }
      
      contextText = parts.join(' ');
      
      // Thêm thông tin về việc sử dụng context
      let response = formatScheduleList(schedules, contextText, !intent.date);
      
      if (intent.usedContext && schedules.length > 0) {
        response += '\n\n_💡 Tôi đã sử dụng thông tin từ câu hỏi trước._';
      }
      
      return response;

    default:
      return randomChoice(UNKNOWN_RESPONSES);
  }
}

/**
 * Tạo câu trả lời lỗi
 */
export function formatErrorResponse(): string {
  return `Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn.

Vui lòng thử lại hoặc hỏi câu hỏi khác.`;
}
