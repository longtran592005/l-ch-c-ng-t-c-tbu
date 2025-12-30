/**
 * Module chuẩn hóa văn bản cho chatbot
 * Xử lý: lowercase, bỏ dấu câu, chuẩn hóa khoảng trắng
 * 
 * @author Trường Đại học Thái Bình
 */

// ========================
// CONSTANTS
// ========================

/**
 * Bảng chuyển đổi tiếng Việt có dấu sang không dấu
 */
const VIETNAMESE_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'đ': 'd',
  'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
  'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
  'Đ': 'D',
};

// ========================
// NORMALIZATION FUNCTIONS
// ========================

/**
 * Chuyển đổi văn bản tiếng Việt thành không dấu
 * @param text - Văn bản cần chuyển đổi
 * @returns Văn bản không dấu
 */
export function removeVietnameseAccents(text: string): string {
  return text.split('').map(char => VIETNAMESE_MAP[char] || char).join('');
}

/**
 * Loại bỏ dấu câu và ký tự đặc biệt
 * @param text - Văn bản cần xử lý
 * @returns Văn bản đã loại bỏ dấu câu
 */
export function removePunctuation(text: string): string {
  // Giữ lại / và - vì có thể là ngày tháng (dd/mm, dd-mm)
  return text.replace(/[^\w\s\/\-áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/gi, ' ');
}

/**
 * Chuẩn hóa khoảng trắng (loại bỏ khoảng trắng thừa)
 * @param text - Văn bản cần xử lý
 * @returns Văn bản đã chuẩn hóa khoảng trắng
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Hàm chuẩn hóa chính - áp dụng tất cả bước xử lý
 * @param text - Văn bản gốc từ người dùng
 * @param options - Tùy chọn chuẩn hóa
 * @returns Văn bản đã chuẩn hóa
 */
export interface NormalizeOptions {
  lowercase?: boolean;           // Chuyển về chữ thường (mặc định: true)
  removePunctuation?: boolean;   // Loại bỏ dấu câu (mặc định: true)
  removeAccents?: boolean;       // Loại bỏ dấu tiếng Việt (mặc định: false)
  normalizeWhitespace?: boolean; // Chuẩn hóa khoảng trắng (mặc định: true)
}

export function normalizeText(text: string, options: NormalizeOptions = {}): string {
  const {
    lowercase = true,
    removePunctuation: removePunc = true,
    removeAccents = false,
    normalizeWhitespace: normalizeWs = true,
  } = options;

  let result = text;

  // Bước 1: Chuyển về chữ thường
  if (lowercase) {
    result = result.toLowerCase();
  }

  // Bước 2: Loại bỏ dấu câu
  if (removePunc) {
    result = removePunctuation(result);
  }

  // Bước 3: Loại bỏ dấu tiếng Việt (tùy chọn)
  if (removeAccents) {
    result = removeVietnameseAccents(result);
  }

  // Bước 4: Chuẩn hóa khoảng trắng
  if (normalizeWs) {
    result = normalizeWhitespace(result);
  }

  return result;
}

/**
 * So sánh hai chuỗi sau khi chuẩn hóa
 * @param text1 - Chuỗi thứ nhất
 * @param text2 - Chuỗi thứ hai
 * @returns true nếu hai chuỗi giống nhau sau khi chuẩn hóa
 */
export function compareNormalized(text1: string, text2: string): boolean {
  return normalizeText(text1) === normalizeText(text2);
}

/**
 * Kiểm tra chuỗi có chứa từ khóa không (sau khi chuẩn hóa)
 * @param text - Văn bản cần kiểm tra
 * @param keyword - Từ khóa cần tìm
 * @returns true nếu có chứa từ khóa
 */
export function containsKeyword(text: string, keyword: string): boolean {
  return normalizeText(text).includes(normalizeText(keyword));
}

/**
 * Kiểm tra chuỗi có chứa bất kỳ từ khóa nào trong danh sách không
 * @param text - Văn bản cần kiểm tra
 * @param keywords - Danh sách từ khóa
 * @returns true nếu có chứa ít nhất một từ khóa
 */
export function containsAnyKeyword(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text);
  return keywords.some(keyword => normalizedText.includes(normalizeText(keyword)));
}
