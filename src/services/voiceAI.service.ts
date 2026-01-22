/**
 * Voice AI Service v5.1 - Deep Field Optimization
 * Tập trung xử lý chuẩn xác Content, Participants, PreparingUnit và Notes.
 */

import { ScheduleEventType } from '@/types';

export type ScheduleField =
    | 'date'
    | 'startTime'
    | 'endTime'
    | 'content'
    | 'location'
    | 'leader'
    | 'participants'
    | 'preparingUnit'
    | 'eventType'
    | 'notes';

export interface FieldMetadata {
    name: ScheduleField;
    label: string;
    type: 'date' | 'time' | 'string' | 'array' | 'enum';
    required: boolean;
    placeholder: string;
    hint: string;
    enumValues?: { label: string; value: string }[];
}

export interface VoiceProcessingResult {
    status: 'WAIT' | 'DONE';
    field?: ScheduleField;
    value?: any;
    error?: string;
}

export const SCHEDULE_FIELDS: FieldMetadata[] = [
    { name: 'date', label: 'Ngày công tác', type: 'date', required: true, placeholder: 'VD: ngày 15 tháng 6', hint: 'Nói ngày, ví dụ: "Ngày 15 tháng 6 xong".' },
    { name: 'startTime', label: 'Giờ bắt đầu', type: 'time', required: true, placeholder: 'VD: 8 giờ sáng', hint: 'Nói giờ bắt đầu, ví dụ: "Tám giờ xong".' },
    { name: 'endTime', label: 'Giờ kết thúc', type: 'time', required: false, placeholder: 'VD: 10 giờ', hint: 'Nói giờ kết thúc, ví dụ: "Mười giờ xong".' },
    { name: 'content', label: 'Nội dung công tác', type: 'string', required: true, placeholder: 'VD: Họp giao ban tuần', hint: 'Nói nội dung.' },
    { name: 'location', label: 'Địa điểm', type: 'string', required: true, placeholder: 'VD: Phòng họp số 3', hint: 'Nói địa điểm.' },
    { name: 'leader', label: 'Lãnh đạo chủ trì', type: 'string', required: true, placeholder: 'VD: Nguyễn Văn Long', hint: 'Nói tên lãnh đạo.' },
    { name: 'participants', label: 'Thành phần tham dự', type: 'array', required: false, placeholder: 'VD: Ban giám hiệu; Phòng đào tạo', hint: 'Nói các thành phần, tách bằng "và", "với" hoặc "dấu phẩy".' },
    { name: 'preparingUnit', label: 'Đơn vị chuẩn bị', type: 'string', required: false, placeholder: 'VD: Văn phòng TRƯỜNG', hint: 'Nói đơn vị chuẩn bị.' },
    { name: 'cooperatingUnits', label: 'Đơn vị phối hợp', type: 'string', required: false, placeholder: 'VD: Phòng CNTT, Phòng Đào tạo', hint: 'Nói đơn vị phối hợp.' },
    { name: 'eventType', label: 'Loại sự kiện', type: 'enum', required: true, placeholder: 'Chọn loại...', enumValues: [{ label: 'Cuộc họp', value: 'cuoc_hop' }, { label: 'Hội nghị', value: 'hoi_nghi' }, { label: 'Tạm ngưng', value: 'tam_ngung' }], hint: 'Nói: Cuộc họp hoặc Hội nghị.' },
    { name: 'notes', label: 'Ghi chú', type: 'string', required: false, placeholder: 'VD: Mang theo tài liệu', hint: 'Nói ghi chú.' }
];

const SYSTEM_PROMPT = `Bạn là AI CHUẨN HÓA DỮ LIỆU. Nhiệm vụ: Chuyển transcript thành GIÁ TRỊ THUẦN.

━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ NGUYÊN TẮC VÀNG (BẮT BUỘC)
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CHỈ TRẢ VỀ GIÁ TRỊ THUẦN. Tuyệt đối KHÔNG markdown, KHÔNG giải thích, KHÔNG lặp lại câu hỏi.
2. KHÔNG TỰ Ý TÓM TẮT. Giữ nguyên ý nghĩa và các chi tiết quan trọng của văn bản gốc.
3. LOẠI BỎ TỪ KHÓA KẾT THÚC ("hết", "xong", "kết thúc") khỏi kết quả cuối cùng.
4. VIẾT HOA ĐÚNG: Viết hoa chữ cái đầu câu và các danh từ riêng tiếng Việt (Tên người, bộ phận, địa điểm).

━━━━━━━━━━━━━━━━━━━━━━━━━━
� QUY TẮC THEO FIELD ({{FIELD_NAME}})
━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Nếu FIELD = "content" | "notes" | "preparingUnit":
   - Giữ nguyên toàn bộ câu từ, chỉ chuẩn hóa chính tả và viết hoa. 
   - Ví dụ: "họp giao ban tuần quý một năm hai không hai sáu xong" -> "Họp giao ban tuần Quý 1 năm 2026"

▶ Nếu FIELD = "participants" (Kiểu mảng):
   - BẮT BUỘC trả về mảng JSON các chuỗi: ["Thành phần A", "Thành phần B"].
   - Tách dựa trên các từ: "và", "với", "phẩy", "chấm phẩy".

▶ Nếu FIELD = "date": YYYY-MM-DD
▶ Nếu FIELD = "startTime" | "endTime": HH:mm (Bắt buộc 2 chữ số, VD: 08:00)

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎤 VĂN BẢN ĐẦU VÀO:
{{RAW_TEXT}}

━━━━━━━━━━━━━━━━━━━━━━━━━━
{{ENUM_CONTEXT}}

OUTPUT (CHỈ GIÁ TRỊ THUẦN):`;

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5';

async function processWithLLM(transcript: string, fieldMeta: FieldMetadata): Promise<VoiceProcessingResult> {
    let enumContext = "";
    if (fieldMeta.type === 'enum' && fieldMeta.enumValues) {
        enumContext = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n▶ Nếu FIELD = "eventType" (Enum):\nCHỈ trả về một trong các ID sau: ${fieldMeta.enumValues.map(e => e.value).join(', ')}\n(Ví dụ: người dùng nói "cuộc họp" -> trả về "cuoc_hop")`;
    }

    const prompt = SYSTEM_PROMPT
        .replace('{{FIELD_NAME}}', fieldMeta.name)
        .replace('{{FIELD_TYPE}}', fieldMeta.type)
        .replace('{{ENUM_CONTEXT}}', enumContext)
        .replace('{{RAW_TEXT}}', transcript);

    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.1 }
            })
        });

        const data = await response.json();
        let aiResult = data.response?.trim() || "";

        // Làm sạch Markdown nếu có
        aiResult = aiResult.replace(/```json|```/g, '').trim();

        if (aiResult.toLowerCase() === 'null' || !aiResult) {
            return { status: 'DONE', field: fieldMeta.name, value: null };
        }

        let finalValue: any = aiResult;

        if (fieldMeta.type === 'array') {
            try {
                // Nếu AI trả về chuỗi có ngoặc [], parse nó
                if (aiResult.startsWith('[') && aiResult.endsWith(']')) {
                    finalValue = JSON.parse(aiResult);
                } else {
                    // Nếu AI trả về chuỗi thuần, bọc lại thành mảng
                    finalValue = [aiResult.replace(/"/g, '')];
                }
            } catch {
                finalValue = [aiResult.replace(/"/g, '')];
            }
        } else {
            // Đối với các trường string/time/date: Xóa dấu ngoặc bao quanh nếu có
            if (finalValue.startsWith('"') && finalValue.endsWith('"')) {
                finalValue = finalValue.substring(1, finalValue.length - 1);
            }
        }

        return { status: 'DONE', field: fieldMeta.name, value: finalValue };
    } catch (error) {
        console.error('LLM Error:', error);
        return { status: 'DONE', field: fieldMeta.name, value: null };
    }
}

export async function processVoiceInput(transcript: string, currentField: ScheduleField): Promise<VoiceProcessingResult> {
    const fieldMeta = SCHEDULE_FIELDS.find(f => f.name === currentField);
    if (!fieldMeta) return { status: 'DONE' };
    return await processWithLLM(transcript, fieldMeta);
}

export function getNextField(currentField: ScheduleField): ScheduleField | null {
    const idx = SCHEDULE_FIELDS.findIndex(f => f.name === currentField);
    return idx < SCHEDULE_FIELDS.length - 1 ? SCHEDULE_FIELDS[idx + 1].name : null;
}

export function getFieldMetadata(field: ScheduleField): FieldMetadata | undefined {
    return SCHEDULE_FIELDS.find(f => f.name === field);
}
