/**
 * Database FAQ cho chatbot
 * Chứa các câu hỏi và câu trả lời thông dụng
 *
 * @author Trường Đại học Thái Bình
 */

export interface FAQItem {
  question: string;
  answer: string;
  keywords: string[];
  category: 'general' | 'admission' | 'academic' | 'facilities' | 'other';
}

/**
 * Danh sách FAQ chính thức
 */
export const FAQ_DATABASE: FAQItem[] = [
  {
    question: 'Điểm chuẩn năm nay là bao nhiêu?',
    answer: 'Điểm chuẩn được công bố sau kỳ thi THPT Quốc gia. Để biết điểm chuẩn cụ thể cho từng ngành, bạn có thể:\n\n📌 Truy cập website: www.tbu.edu.vn\n📌 Kiểm tra thông tin tuyển sinh\n📌 Liên hệ Phòng Đào tạo',
    keywords: ['điểm chuẩn', 'điểm sàn', 'điểm thi', 'ngưỡng'],
    category: 'admission'
  },
  {
    question: 'Học phí như thế nào?',
    answer: 'Học phí được quy định theo từng năm học và từng ngành đào tạo. Chi tiết học phí được công bố trên website trường.\n\n💰 **Xem học phí tại:**\n• Website trường\n• Phòng Đào tạo\n• Thông báo tuyển sinh',
    keywords: ['học phí', 'tiền học', 'phí đào tạo', 'chi phí'],
    category: 'admission'
  },
  {
    question: 'Có những ngành đào tạo nào?',
    answer: 'Trường Đại học Thái Bình đào tạo đa ngành các lĩnh vực:\n\n📚 **Các ngành chính:**\n• Khoa Kinh tế\n• Khoa Quản trị\n• Khoa Ngôn ngữ\n• Khoa Công nghệ thông tin\n• Khoa Cơ khí - Lý tự động hóa\n• Khoa Nông nghiệp\n\n📌 Chi tiết từng ngành xem tại website trường.',
    keywords: ['ngành', 'chuyên ngành', 'đào tạo', 'khoa', 'học ngành gì'],
    category: 'academic'
  },
  {
    question: 'Thời gian học bao lâu?',
    answer: '⏰ **Thời gian đào tạo:**\n\n• Chương trình đại học: **4 năm**\n• Chương trình cao học: **2 năm**\n• Chương trình liên thông: Theo quy định\n\nGiờ học thường:\n• Thứ 2 - Thứ 6: 8:00 - 17:00\n• Thứ 7: 8:00 - 12:00',
    keywords: ['thời gian', 'bao lâu', 'năm học', 'giờ học'],
    category: 'academic'
  },
  {
    question: 'Địa chỉ trường ở đâu?',
    answer: '📍 **Địa chỉ:**\nTrường Đại học Thái Bình\n[Số nhà, Tên đường]\nQuận/Huyện, Tỉnh/TP\n\n📞 **Điện thoại:** [Số điện thoại]\n📧 **Email:** contact@tbu.edu.vn\n\nBạn có thể đến trường làm việc vào giờ hành chính.',
    keywords: ['địa chỉ', 'ở đâu', 'nằm ở đâu', 'vị trí'],
    category: 'general'
  },
  {
    question: 'Nhà trường có KTX không?',
    answer: '🏢 **Khuôn viên & Nhà ở:**\n\nTrường có KTX và ký túc xá cho sinh viên:\n• KTX trường: Có phòng 2-4 người\n• Ký túc xá: Có các khu vực gần trường\n\n💡 Để biết chi tiết giá và đăng ký, liên hệ Phòng Công tác sinh viên.',
    keywords: ['nhà ở', 'ktx', 'ký túc xá', 'khung viên', 'ở đâu'],
    category: 'facilities'
  },
  {
    question: 'Làm thế nào để đăng ký?',
    answer: '📝 **Quy trình đăng ký tuyển sinh:**\n\n1️⃣ Chuẩn bị hồ sơ:\n• Bảng điểm THPT\n• CCCD/CMND\n• Hồ sơ học tập (bản sao công chứng)\n• Ảnh thẻ (3x4)\n\n2️⃣ Nộp hồ sơ:\n• Trực tiếp tại Phòng Đào tạo\n• Hoặc đăng ký online qua website\n\n3️⃣ Theo dõi thông báo:\n• Kết quả xét tuyển\n• Thông báo nhập học',
    keywords: ['đăng ký', 'nhập học', 'tuyển', 'nộp hồ sơ', 'làm sao'],
    category: 'admission'
  },
  {
    question: 'Lịch thi khi nào?',
    answer: '📅 **Lịch thi:**\n\n• Lịch thi được thông báo trước **2 tuần**\n• Đăng tải trên website trường\n• Hoặc tại bảng tin Phòng Đào tạo\n\n💡 Bạn nên theo dõi website để cập nhật thông tin mới nhất.',
    keywords: ['thi', 'lịch thi', 'bài kiểm tra', 'kiểm tra'],
    category: 'academic'
  },
  {
    question: 'Xem bảng điểm ở đâu?',
    answer: '📊 **Tra cứu bảng điểm:**\n\n• Website trường: Đăng nhập hệ thống sinh viên\n• Phòng Đào tạo: Nhận bảng điểm trực tiếp\n\n💡 Bảng điểm được cập nhật sau mỗi kỳ thi.',
    keywords: ['bảng điểm', 'kết quả học tập', 'điểm', 'xem điểm'],
    category: 'academic'
  },
  {
    question: 'Có học bổng không?',
    answer: '💰 **Học bổng & Hỗ trợ tài chính:**\n\nTrường có các chính sách hỗ trợ:\n• Học bổng khuyến khích học tập\n• Hỗ trợ sinh viên nghèo vượt khó\n• Học bổng xã hội\n• Học bổng tài năng\n\n📌 Chi tiết xem tại thông báo tuyển sinh hoặc liên hệ Phòng Công tác sinh viên.',
    keywords: ['học bổng', 'tiền', 'giảm học phí', 'trợ cấp'],
    category: 'facilities'
  },
  {
    question: 'Website trường là gì?',
    answer: '🌐 **Website chính thức:**\n\nwww.tbu.edu.vn\n\nTại đây bạn có thể tìm:\n• Tin tức & Thông báo\n• Lịch công tác\n• Chương trình đào tạo\n• Thông tin tuyển sinh\n• Hệ thống sinh viên\n• Liên hệ',
    keywords: ['website', 'trang web', 'web', 'tên miền'],
    category: 'general'
  },
  {
    question: 'Giờ làm việc của trường?',
    answer: '⏰ **Giờ làm việc:**\n\n• Thứ 2 - Thứ 6: **8:00 - 17:00**\n• Thứ 7: **8:00 - 12:00**\n• Chủ nhật: Nghỉ\n\n💡 Các phòng ban làm việc theo giờ hành chính của trường.',
    keywords: ['giờ làm việc', 'mở cửa', 'đóng cửa', 'giờ hành chính'],
    category: 'general'
  }
];

/**
 * Tìm kiếm FAQ theo từ khóa
 */
export function searchFAQ(query: string): FAQItem[] {
  const normalizedQuery = query.toLowerCase().trim();
  const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

  return FAQ_DATABASE.filter(faq => {
    // Check keywords
    const keywordMatches = faq.keywords.some(keyword =>
      normalizedQuery.includes(keyword.toLowerCase())
    );

    // Check question
    const questionMatches = keywords.some(keyword =>
      faq.question.toLowerCase().includes(keyword)
    );

    return keywordMatches || questionMatches;
  }).slice(0, 3); // Giới hạn 3 kết quả
}

/**
 * Format kết quả FAQ thành câu trả lời
 */
export function formatFAQAnswer(items: FAQItem[]): string {
  if (items.length === 0) {
    return 'Không tìm thấy câu trả lời phù hợp. Bạn có thể:\n• Hỏi lại với từ khóa khác\n• Liên hệ Phòng Đào tạo: [Số điện thoại]\n• Kiểm tra website: www.tbu.edu.vn';
  }

  if (items.length === 1) {
    return `📝 **${items[0].question}**\n\n${items[0].answer}`;
  }

  let response = `Tôi tìm thấy ${items.length} câu trả lời liên quan:\n\n`;
  items.forEach((item, index) => {
    response += `${index + 1}. ${item.question}\n`;
  });
  response += '\nBạn muốn hỏi về câu nào?';

  return response;
}
