/**
 * Voice AI Service - Xử lý giọng nói thông minh cho nhập liệu lịch công tác
 * 
 * Sử dụng LLM để chuẩn hóa dữ liệu giọng nói theo từng trường
 * 
 * @author TBU AI Team
 * @version 1.0
 */

import { ScheduleEventType } from '@/types';

// ========================
// TYPES & INTERFACES
// ========================

/**
 * Định nghĩa các trường trong form lịch công tác
 */
export type ScheduleField =
    | 'date'           // Ngày
    | 'startTime'      // Giờ bắt đầu
    | 'endTime'        // Giờ kết thúc
    | 'content'        // Nội dung
    | 'location'       // Địa điểm
    | 'leader'         // Lãnh đạo chủ trì
    | 'participants'   // Thành phần tham dự
    | 'preparingUnit'  // Đơn vị chuẩn bị
    | 'eventType'      // Loại sự kiện
    | 'notes';         // Ghi chú

/**
 * Metadata cho từng trường
 */
export interface FieldMetadata {
    name: ScheduleField;
    label: string;
    type: 'date' | 'time' | 'string' | 'array' | 'enum';
    required: boolean;
    placeholder: string;
    hint: string; // Gợi ý cho người dùng
    enumValues?: string[]; // Cho enum type
}

/**
 * Kết quả xử lý giọng nói
 */
export interface VoiceProcessingResult {
    status: 'WAIT' | 'DONE';
    field?: ScheduleField;
    value?: any;
    error?: string;
    confidence?: number; // Độ tin cậy (0-1)
}

// ========================
// FIELD DEFINITIONS
// ========================

/**
 * Định nghĩa thứ tự và metadata các trường
 */
export const SCHEDULE_FIELDS: FieldMetadata[] = [
    {
        name: 'date',
        label: 'Ngày',
        type: 'date',
        required: true,
        placeholder: 'VD: ngày 15 tháng 1 năm 2026',
        hint: 'Hãy nói ngày tổ chức, ví dụ: "ngày 15 tháng 1 năm 2026 hết"'
    },
    {
        name: 'startTime',
        label: 'Giờ bắt đầu',
        type: 'time',
        required: true,
        placeholder: 'VD: 8 giờ sáng',
        hint: 'Hãy nói giờ bắt đầu, ví dụ: "8 giờ sáng hết" hoặc "14 giờ hết"'
    },
    {
        name: 'endTime',
        label: 'Giờ kết thúc',
        type: 'time',
        required: false,
        placeholder: 'VD: 10 giờ',
        hint: 'Hãy nói giờ kết thúc, ví dụ: "10 giờ hết" hoặc bỏ qua bằng cách nói "hết"'
    },
    {
        name: 'content',
        label: 'Nội dung công tác',
        type: 'string',
        required: true,
        placeholder: 'VD: Họp giao ban tuần',
        hint: 'Hãy nói nội dung cuộc họp, ví dụ: "Họp Giao Ban Tuần hết"'
    },
    {
        name: 'location',
        label: 'Địa điểm',
        type: 'string',
        required: true,
        placeholder: 'VD: Phòng họp A',
        hint: 'Hãy nói địa điểm tổ chức, ví dụ: "Phòng Họp A hết"'
    },
    {
        name: 'leader',
        label: 'Lãnh đạo chủ trì',
        type: 'string',
        required: true,
        placeholder: 'VD: Thầy Nguyễn Văn Nam',
        hint: 'Hãy nói tên lãnh đạo chủ trì, ví dụ: "Thầy Nguyễn Văn Nam hết"'
    },
    {
        name: 'participants',
        label: 'Thành phần tham dự',
        type: 'array',
        required: false,
        placeholder: 'VD: Ban Giám hiệu, Phòng Đào tạo',
        hint: 'Hãy nói các thành phần tham dự, ví dụ: "Ban Giám Hiệu, Phòng Đào Tạo hết"'
    },
    {
        name: 'preparingUnit',
        label: 'Đơn vị chuẩn bị',
        type: 'string',
        required: false,
        placeholder: 'VD: Phòng Hành chính',
        hint: 'Hãy nói đơn vị chuẩn bị, ví dụ: "Phòng Hành Chính hết" hoặc bỏ qua bằng cách nói "hết"'
    },
    {
        name: 'eventType',
        label: 'Loại sự kiện',
        type: 'enum',
        required: true,
        placeholder: 'Cuộc họp / Hội nghị / Tạm ngưng',
        hint: 'Hãy nói loại sự kiện: "Cuộc Họp hết", "Hội Nghị hết", hoặc "Tạm Ngưng hết"',
        enumValues: ['cuoc_hop', 'hoi_nghi', 'tam_ngung']
    },
    {
        name: 'notes',
        label: 'Ghi chú',
        type: 'string',
        required: false,
        placeholder: 'VD: Mang theo tài liệu',
        hint: 'Hãy nói ghi chú nếu có, ví dụ: "Mang theo tài liệu hết" hoặc bỏ qua bằng cách nói "hết"'
    }
];

// ========================
// AI PROMPT SYSTEM
// ========================

/**
 * System prompt cho AI xử lý giọng nói
 */
const SYSTEM_PROMPT = `Bạn là AI nhập liệu lịch công tác bằng giọng nói, hoạt động theo quy trình tuần tự từng trường.

=====================
I. NGUYÊN TẮC TỔNG QUÁT (BẮT BUỘC TUÂN THỦ)
=====================

1. Bạn làm việc theo TỪNG TRƯỜNG MỘT, đúng thứ tự hệ thống cung cấp.
2. Mỗi lần xử lý CHỈ liên quan đến MỘT trường duy nhất.
3. Bạn CHỈ xử lý khi nội dung có chứa từ khóa kết thúc là "hết".
4. Nếu CHƯA có từ "hết" → KHÔNG trả kết quả, trả về trạng thái WAIT.
5. KHÔNG tự chuyển sang trường khác nếu chưa nghe "hết".
6. KHÔNG thêm, bớt, suy đoán, hoặc sáng tác nội dung người dùng KHÔNG nói.
7. KHÔNG gộp nhiều trường trong một kết quả.
8. Kết quả PHẢI là JSON hợp lệ, đúng schema, không có văn bản thừa.
9. Nếu không thể xác định giá trị hợp lệ → trả về null đúng kiểu dữ liệu.
10. Luôn ưu tiên an toàn dữ liệu, không làm sai cấu trúc CSDL.

=====================
II. XỬ LÝ NGÔN NGỮ GIỌNG NÓI
=====================

Bạn sẽ nhận văn bản thô đã được chuyển từ giọng nói (speech-to-text).

- Bỏ từ "hết" ở cuối câu.
- Chuẩn hóa nội dung theo NGỮ CẢNH LỊCH CÔNG TÁC:
  - Ngày, giờ → chuẩn ISO (YYYY-MM-DD, HH:MM:SS)
  - Số → chuyển sang số (một → 1, quý một → quý 1)
  - Tên riêng → viết hoa chữ cái đầu
  - Địa điểm, đơn vị → viết thường, có dấu
- Không tự dịch sang tiếng khác.
- Không mở rộng câu nói.

=====================
III. QUY TẮC THEO KIỂU DỮ LIỆU
=====================

1. date:
   - Nhận dạng các dạng nói như:
     "ngày 15 tháng 1 năm 2026"
     "ngày 15 tháng 1"
     "15 tháng 1"
   - Trả về dạng: YYYY-MM-DD
   - Nếu không có năm, dùng năm hiện tại

2. time:
   - "8 giờ sáng" → 08:00:00
   - "2 giờ chiều" → 14:00:00
   - "8 giờ 30" → 08:30:00
   - "14 giờ" → 14:00:00

3. string:
   - Giữ nguyên ý
   - Viết hoa chữ cái đầu câu
   - Viết hoa tên riêng (người, địa điểm, đơn vị)

4. array:
   - Tách bằng dấu phẩy
   - Mỗi phần tử viết hoa chữ cái đầu
   - VD: "Ban Giám Hiệu, Phòng Đào Tạo" → ["Ban Giám Hiệu", "Phòng Đào Tạo"]

5. enum (eventType):
   - "cuộc họp", "họp" → "cuoc_hop"
   - "hội nghị" → "hoi_nghi"
   - "tạm ngưng", "hoãn" → "tam_ngung"

=====================
IV. CƠ CHẾ TRẢ KẾT QUẢ
=====================

Bạn chỉ được trả về MỘT trong 2 dạng sau:

A. CHƯA KẾT THÚC (chưa nghe "hết"):

{
  "status": "WAIT"
}

B. ĐÃ KẾT THÚC – TRẢ GIÁ TRỊ TRƯỜNG:

{
  "status": "DONE",
  "field": "<tên_trường>",
  "value": <giá_trị_đã_chuẩn_hóa>,
  "confidence": <0.0-1.0>
}

=====================
V. VÍ DỤ XỬ LÝ
=====================

Input: "ngày 15 tháng 1 năm 2026"
Output: {"status": "WAIT"}

Input: "ngày 15 tháng 1 năm 2026 hết"
Output: {"status": "DONE", "field": "date", "value": "2026-01-15", "confidence": 0.95}

Input: "8 giờ sáng hết"
Output: {"status": "DONE", "field": "startTime", "value": "08:00:00", "confidence": 0.95}

Input: "Họp giao ban tuần hết"
Output: {"status": "DONE", "field": "content", "value": "Họp Giao Ban Tuần", "confidence": 0.9}

Input: "Ban Giám Hiệu, Phòng Đào Tạo hết"
Output: {"status": "DONE", "field": "participants", "value": ["Ban Giám Hiệu", "Phòng Đào Tạo"], "confidence": 0.9}

Input: "hết"
Output: {"status": "DONE", "field": "<current_field>", "value": null, "confidence": 1.0}

=====================
VI. TUYỆT ĐỐI KHÔNG ĐƯỢC
=====================

- Không trả nhiều field
- Không trả giải thích
- Không trả Markdown
- Không trả text ngoài JSON
- Không sửa schema
- Không tự chuyển field`;

// ========================
// OLLAMA INTEGRATION
// ========================

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5';

/**
 * Kiểm tra Ollama có đang chạy không
 */
async function checkOllamaStatus(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('http://localhost:11434', {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Xử lý giọng nói bằng Ollama Qwen Local
 */
async function processWithOllama(
    transcript: string,
    fieldMeta: FieldMetadata
): Promise<VoiceProcessingResult> {
    const normalized = transcript.toLowerCase().trim();

    // Kiểm tra từ khóa "hết"
    if (!normalized.includes('hết')) {
        return { status: 'WAIT' };
    }

    // Loại bỏ từ "hết"
    const content = normalized.replace(/\s*hết\s*$/i, '').trim();

    // Nếu chỉ nói "hết" (bỏ qua field)
    if (content === '') {
        return {
            status: 'DONE',
            field: fieldMeta.name,
            value: null,
            confidence: 1.0
        };
    }

    // Tạo prompt cho Ollama
    const prompt = `${SYSTEM_PROMPT}

=====================
NHIỆM VỤ HIỆN TẠI
=====================

Trường đang xử lý: ${fieldMeta.name}
Nhãn: ${fieldMeta.label}
Loại dữ liệu: ${fieldMeta.type}
${fieldMeta.enumValues ? `Giá trị hợp lệ: ${fieldMeta.enumValues.join(', ')}` : ''}
Bắt buộc: ${fieldMeta.required ? 'Có' : 'Không'}

Văn bản giọng nói (đã loại bỏ từ "hết"): "${content}"

=====================
YÊU CẦU
=====================

Hãy xử lý văn bản trên và trả về JSON theo đúng format sau:

{
  "status": "DONE",
  "field": "${fieldMeta.name}",
  "value": <giá_trị_đã_chuẩn_hóa>,
  "confidence": <0.0-1.0>
}

CHÚ Ý:
- CHỈ trả về JSON, KHÔNG thêm text khác
- Chuẩn hóa giá trị theo đúng kiểu dữ liệu ${fieldMeta.type}
- Nếu không xác định được giá trị hợp lệ, trả về null

Trả về JSON:`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 200
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.response?.trim();

        if (!aiResponse) {
            throw new Error('Empty response from Ollama');
        }

        // Parse JSON response từ AI
        try {
            const parsed = JSON.parse(aiResponse);
            console.log('[VoiceAI] Ollama response:', parsed);
            return parsed as VoiceProcessingResult;
        } catch (parseError) {
            console.warn('[VoiceAI] Failed to parse Ollama JSON, using fallback');
            throw parseError;
        }

    } catch (error) {
        console.error('[VoiceAI] Ollama request failed:', error);
        throw error;
    }
}

/**
 * Xử lý giọng nói bằng AI (Ollama Qwen Local với Fallback)
 */
export async function processVoiceInput(
    transcript: string,
    currentField: ScheduleField
): Promise<VoiceProcessingResult> {
    try {
        // Tìm metadata của field hiện tại
        const fieldMeta = SCHEDULE_FIELDS.find(f => f.name === currentField);
        if (!fieldMeta) {
            return {
                status: 'DONE',
                error: 'Invalid field'
            };
        }

        // Kiểm tra Ollama có chạy không
        const isOllamaRunning = await checkOllamaStatus();

        if (isOllamaRunning) {
            try {
                console.log('[VoiceAI] Using Ollama Qwen for processing');
                const result = await processWithOllama(transcript, fieldMeta);
                return result;
            } catch (error) {
                console.warn('[VoiceAI] Ollama failed, falling back to rule-based');
            }
        } else {
            console.log('[VoiceAI] Ollama not running, using fallback');
        }

        // Fallback to rule-based processing
        const result = fallbackProcessing(transcript, fieldMeta);
        return result;

    } catch (error) {
        console.error('[VoiceAI] Processing error:', error);
        return {
            status: 'DONE',
            error: 'Lỗi xử lý giọng nói. Vui lòng thử lại.'
        };
    }
}

/**
 * Fallback processing khi không có LLM
 * (Sử dụng rule-based như hiện tại)
 */
function fallbackProcessing(
    transcript: string,
    fieldMeta: FieldMetadata
): VoiceProcessingResult {
    const normalized = transcript.toLowerCase().trim();

    // Kiểm tra từ khóa "hết"
    if (!normalized.includes('hết')) {
        return { status: 'WAIT' };
    }

    // Loại bỏ từ "hết"
    const content = normalized.replace(/\s*hết\s*$/i, '').trim();

    // Nếu chỉ nói "hết" (bỏ qua field)
    if (content === '') {
        return {
            status: 'DONE',
            field: fieldMeta.name,
            value: null,
            confidence: 1.0
        };
    }

    // Xử lý theo loại field
    let value: any = null;
    let confidence = 0.8;

    switch (fieldMeta.type) {
        case 'date':
            value = parseDate(content);
            confidence = value ? 0.9 : 0.5;
            break;

        case 'time':
            value = parseTime(content);
            confidence = value ? 0.9 : 0.5;
            break;

        case 'string':
            value = capitalizeProperNouns(content);
            confidence = 0.85;
            break;

        case 'array':
            value = parseArray(content);
            confidence = 0.85;
            break;

        case 'enum':
            value = parseEnum(content, fieldMeta.enumValues || []);
            confidence = value ? 0.9 : 0.5;
            break;
    }

    return {
        status: 'DONE',
        field: fieldMeta.name,
        value,
        confidence
    };
}

// ========================
// PARSING UTILITIES
// ========================

/**
 * Parse ngày từ giọng nói
 */
function parseDate(text: string): string | null {
    const currentYear = new Date().getFullYear();

    // Pattern: "ngày 15 tháng 1 năm 2026"
    const pattern1 = /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/i;
    const match1 = text.match(pattern1);

    if (match1) {
        const day = parseInt(match1[1]);
        const month = parseInt(match1[2]);
        const year = match1[3] ? parseInt(match1[3]) : currentYear;

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
    }

    // Pattern: "15 tháng 1"
    const pattern2 = /(\d{1,2})\s+tháng\s+(\d{1,2})/i;
    const match2 = text.match(pattern2);

    if (match2) {
        const day = parseInt(match2[1]);
        const month = parseInt(match2[2]);

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
    }

    return null;
}

/**
 * Parse giờ từ giọng nói
 */
function parseTime(text: string): string | null {
    // "8 giờ sáng" → 08:00:00
    // "2 giờ chiều" → 14:00:00
    // "8 giờ 30" → 08:30:00

    const patterns = [
        /(\d{1,2})\s*giờ\s*(\d{1,2})?\s*(sáng|chiều|tối)?/i,
        /(\d{1,2})\s*h\s*(\d{1,2})?/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            let hour = parseInt(match[1]);
            const minute = match[2] ? parseInt(match[2]) : 0;
            const period = match[3]?.toLowerCase();

            // Xử lý sáng/chiều/tối
            if (period === 'chiều' && hour < 12) hour += 12;
            if (period === 'tối' && hour < 12) hour += 12;

            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            }
        }
    }

    return null;
}

/**
 * Viết hoa tên riêng
 */
function capitalizeProperNouns(text: string): string {
    return text
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Parse mảng từ giọng nói
 */
function parseArray(text: string): string[] {
    return text
        .split(/,|và/)
        .map(item => capitalizeProperNouns(item.trim()))
        .filter(item => item.length > 0);
}

/**
 * Parse enum từ giọng nói
 */
function parseEnum(text: string, validValues: string[]): string | null {
    const mapping: Record<string, ScheduleEventType> = {
        'cuộc họp': 'cuoc_hop',
        'họp': 'cuoc_hop',
        'hội nghị': 'hoi_nghi',
        'tạm ngưng': 'tam_ngung',
        'hoãn': 'tam_ngung'
    };

    for (const [key, value] of Object.entries(mapping)) {
        if (text.includes(key)) {
            return value;
        }
    }

    return null;
}

/**
 * Lấy field tiếp theo
 */
export function getNextField(currentField: ScheduleField): ScheduleField | null {
    const currentIndex = SCHEDULE_FIELDS.findIndex(f => f.name === currentField);
    if (currentIndex === -1 || currentIndex === SCHEDULE_FIELDS.length - 1) {
        return null;
    }
    return SCHEDULE_FIELDS[currentIndex + 1].name;
}

/**
 * Lấy metadata của field
 */
export function getFieldMetadata(field: ScheduleField): FieldMetadata | undefined {
    return SCHEDULE_FIELDS.find(f => f.name === field);
}
