/**
 * Bảng từ đồng nghĩa cho chatbot
 * Giúp chatbot hiểu được nhiều cách diễn đạt khác nhau
 * 
 * @author Trường Đại học Thái Bình
 */

// ========================
// BẢN ĐỒ TỪ ĐỒNG NGHĨA
// ========================

/**
 * Từ đồng nghĩa về thời gian
 */
export const TIME_SYNONYMS: Record<string, string[]> = {
  'hôm nay': ['hôm nay', 'nay', 'ngày hôm nay', 'today', 'ngày này', 'bữa nay'],
  'ngày mai': ['ngày mai', 'mai', 'tomorrow', 'hôm sau', 'ngày sau'],
  'tuần này': ['tuần này', 'tuần', 'trong tuần', 'cả tuần', 'week', 'tuần nay'],
  'tuần sau': ['tuần sau', 'tuần tới', 'tuần kế tiếp', 'next week'],
  'tháng này': ['tháng này', 'tháng', 'trong tháng'],
};

/**
 * Từ đồng nghĩa về buổi trong ngày
 */
export const PERIOD_SYNONYMS: Record<string, string[]> = {
  'sáng': ['sáng', 'buổi sáng', 'morning', 'sa', 'sớm', 'đầu ngày'],
  'chiều': ['chiều', 'buổi chiều', 'afternoon', 'ch', 'xế chiều'],
  'tối': ['tối', 'buổi tối', 'evening', 'đêm'],
};

/**
 * Từ đồng nghĩa về hành động tra cứu
 */
export const ACTION_SYNONYMS: Record<string, string[]> = {
  'xem': ['xem', 'tra', 'tra cứu', 'tìm', 'kiểm tra', 'check', 'cho xem', 'cho biết', 'có gì', 'có lịch gì', 'lịch gì'],
  'lịch': ['lịch', 'công tác', 'làm việc', 'hoạt động', 'sự kiện', 'công việc', 'lịch trình'],
  'họp': ['họp', 'cuộc họp', 'meeting', 'hội nghị', 'hội thảo', 'buổi họp'],
};

/**
 * Từ đồng nghĩa cho lãnh đạo
 */
export const LEADER_SYNONYMS: Record<string, string[]> = {
  'hiệu trưởng': ['hiệu trưởng', 'ht', 'hiệutrưởng', 'thầy hiệu trưởng', 'hiệu truởng'],
  'phó hiệu trưởng': ['phó hiệu trưởng', 'pht', 'phó ht', 'pho hieu truong', 'phó hiệutrưởng'],
  'trưởng phòng': ['trưởng phòng', 'tp', 'truong phong'],
  'phó trưởng phòng': ['phó trưởng phòng', 'ptp', 'phó tp'],
};

/**
 * Từ đồng nghĩa cho ngày trong tuần
 */
export const DAY_SYNONYMS: Record<string, string[]> = {
  'thứ 2': ['thứ 2', 'thứ hai', 't2', 'th2', 'hai'],
  'thứ 3': ['thứ 3', 'thứ ba', 't3', 'th3', 'ba'],
  'thứ 4': ['thứ 4', 'thứ tư', 't4', 'th4', 'tư', 'bốn'],
  'thứ 5': ['thứ 5', 'thứ năm', 't5', 'th5', 'năm'],
  'thứ 6': ['thứ 6', 'thứ sáu', 't6', 'th6', 'sáu'],
  'thứ 7': ['thứ 7', 'thứ bảy', 't7', 'th7', 'bảy'],
  'chủ nhật': ['chủ nhật', 'cn', 'chu nhat', 'chủnhật'],
};

// ========================
// HÀM TÌM KIẾM TỪ ĐỒNG NGHĨA
// ========================

/**
 * Tìm từ gốc từ các từ đồng nghĩa
 * @param text - Văn bản cần tìm
 * @param synonymMap - Bản đồ từ đồng nghĩa
 * @returns Từ gốc hoặc null nếu không tìm thấy
 */
export function findCanonicalTerm(text: string, synonymMap: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [canonical, synonyms] of Object.entries(synonymMap)) {
    for (const synonym of synonyms) {
      if (lowerText.includes(synonym.toLowerCase())) {
        return canonical;
      }
    }
  }
  
  return null;
}

/**
 * Kiểm tra text có chứa bất kỳ từ đồng nghĩa nào không
 * @param text - Văn bản cần kiểm tra
 * @param synonyms - Danh sách từ đồng nghĩa
 * @returns true nếu có chứa
 */
export function containsSynonym(text: string, synonyms: string[]): boolean {
  const lowerText = text.toLowerCase();
  return synonyms.some(s => lowerText.includes(s.toLowerCase()));
}

/**
 * Thay thế tất cả từ đồng nghĩa bằng từ gốc
 * @param text - Văn bản cần chuẩn hóa
 * @returns Văn bản đã chuẩn hóa
 */
export function normalizeSynonyms(text: string): string {
  let normalized = text.toLowerCase();
  
  // Chuẩn hóa thời gian
  const time = findCanonicalTerm(text, TIME_SYNONYMS);
  if (time) {
    const synonyms = TIME_SYNONYMS[time];
    synonyms.forEach(s => {
      normalized = normalized.replace(new RegExp(s, 'gi'), time);
    });
  }
  
  // Chuẩn hóa buổi
  const period = findCanonicalTerm(text, PERIOD_SYNONYMS);
  if (period) {
    const synonyms = PERIOD_SYNONYMS[period];
    synonyms.forEach(s => {
      normalized = normalized.replace(new RegExp(s, 'gi'), period);
    });
  }
  
  // Chuẩn hóa ngày trong tuần
  const day = findCanonicalTerm(text, DAY_SYNONYMS);
  if (day) {
    const synonyms = DAY_SYNONYMS[day];
    synonyms.forEach(s => {
      normalized = normalized.replace(new RegExp(`\\b${s}\\b`, 'gi'), day);
    });
  }
  
  return normalized;
}
