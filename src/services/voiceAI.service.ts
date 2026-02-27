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
    | 'cooperatingUnits'
    | 'eventType';

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
    { name: 'participants', label: 'Thành phần tham dự', type: 'array', required: false, placeholder: 'VD: Ban giám hiệu; Phòng đào tạo', hint: 'Nói các thành phần, tách bằng "và", "với" hoặc "dấu phẩy".' },
    { name: 'location', label: 'Địa điểm', type: 'string', required: true, placeholder: 'VD: Phòng họp số 3', hint: 'Nói địa điểm.' },
    { name: 'leader', label: 'Lãnh đạo chủ trì', type: 'string', required: false, placeholder: 'VD: Nguyễn Văn Long', hint: 'Nói tên lãnh đạo.' },
    { name: 'preparingUnit', label: 'Đơn vị chuẩn bị', type: 'string', required: false, placeholder: 'VD: Văn phòng TRƯỜNG', hint: 'Nói đơn vị chuẩn bị.' },
    { name: 'cooperatingUnits', label: 'Đơn vị/ cá nhân phối hợp', type: 'string', required: false, placeholder: 'VD: Phòng CNTT, Phòng Đào tạo', hint: 'Nói đơn vị/ cá nhân phối hợp.' },
    { name: 'eventType', label: 'Loại sự kiện', type: 'enum', required: true, placeholder: 'Chọn loại...', enumValues: [{ label: 'Cuộc họp', value: 'cuoc_hop' }, { label: 'Hội nghị', value: 'hoi_nghi' }, { label: 'Tạm ngưng', value: 'tam_ngung' }], hint: 'Nói: Cuộc họp hoặc Hội nghị.' }
];

const SYSTEM_PROMPT = `Nhiệm vụ: Chuyển transcript STT thô thành GIÁ TRỊ CHUẨN DUY NHẤT cho trường: {{FIELD_NAME}} (Kiểu dữ liệu: {{FIELD_TYPE}})

BẢN CHẤT CÔNG VIỆC: Bạn là bộ lọc dữ liệu hành chính cho Trường Đại học Thái Bình. Đầu vào là văn bản giọng nói (thường sai, thiếu dấu, số rời rạc). Bạn phải trả về giá trị đã làm sạch.

BƯỚC 1: LỌC NHIỄU & CỨU LỖI STT
- Loại bỏ từ thừa: "ờ, à, ừm, giúp tôi, cho tôi, làm ơn, đăng ký, hết, xong, kết thúc".
- Ghép số rời rạc thành số đúng: "hai không hai sáu" -> 2026, "một năm" -> 15.
- Chuyển chữ số thành số: "tám" -> 8, "mười lăm" -> 15, "linh/lẻ" -> 0.

BƯỚC 2: QUY TẮC THEO KIỂU DỮ LIỆU (BẮT BUỘC)
- Kiểu 'date': Xuất YYYY-MM-DD. 
- Kiểu 'time': Xuất HH:mm (định dạng 24h). (VD: "hai giờ chiều" -> 14:00, "tám giờ rưỡi" -> 08:30).
- Nếu FIELD_NAME là 'location' (Địa điểm/Mã phòng):
  + Ép các âm đọc sai về mã khu: ép/ét/f/e -> F, hờ/h -> H, a/b/c -> A/B/C.
  + Ghép số phía sau: "phòng ép hai linh tám" -> F208.
- Kiểu 'enum': CHỈ TRẢ VỀ ID tương ứng từ danh sách: {{ENUM_IDS}}. (VD: nói "cuộc họp" -> trả về "cuoc_hop").
- Kiểu 'array': Ngăn cách các thành phần bằng dấu phẩy và khoảng trắng.

BƯỚC 3: TỪ ĐIỂN ĐƠN VỊ TBU
- Đào tạo -> Phòng Đào tạo
- Hành chính/Tổng hợp -> Phòng Hành chính - Tổng hợp
- Kế hoạch/Tài chính -> Phòng Kế hoạch - Tài chính
- Tổ chức cán bộ -> Phòng Tổ chức cán bộ
- Viết hoa toàn bộ tên riêng lãnh đạo và tên các phòng/khoa/địa điểm.

NGUYÊN TẮC VÀNG:
- CHỈ TRẢ VỀ GIÁ TRỊ THUẦN. KHÔNG giải thích, KHÔNG thêm chữ "Kết quả là:".
- Nếu không thể chuẩn hóa hoặc dữ liệu rác -> Trả về chuỗi rỗng.

VĂN BẢN GỐC: {{RAW_TEXT}}
OUTPUT:`;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
// Gọi qua Proxy Backend thay vì gọi trực tiếp Ollama
const AI_PROXY_URL = `${API_BASE_URL}/ai/process`;
const MODEL_NAME = 'qwen2.5:7b';

async function processWithLLM(transcript: string, fieldMeta: FieldMetadata): Promise<VoiceProcessingResult> {
    let enumIds = "";
    if (fieldMeta.type === 'enum' && fieldMeta.enumValues) {
        enumIds = fieldMeta.enumValues.map(e => e.value).join(', ');
    }

    const prompt = SYSTEM_PROMPT
        .replace('{{FIELD_NAME}}', fieldMeta.name)
        .replace('{{FIELD_TYPE}}', fieldMeta.type)
        .replace('{{ENUM_IDS}}', enumIds)
        .replace('{{RAW_TEXT}}', transcript);

    try {
        console.log('[VoiceAI] Processing transcript:', transcript, 'for field:', fieldMeta.name);
        const t0 = performance.now();

        // Gọi Backend Proxy
        const response = await fetch(AI_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                temperature: 0.1
            })
        });

        const networkDuration = ((performance.now() - t0) / 1000).toFixed(2);

        if (!response.ok) {
            console.error('[VoiceAI] Ollama API error:', response.status, response.statusText);
            return { status: 'DONE', field: fieldMeta.name, value: null };
        }

        const data = await response.json();
        const totalDuration = ((performance.now() - t0) / 1000).toFixed(2);
        console.log(`⏱️ [VoiceAI/Ollama] field="${fieldMeta.name}" | network=${networkDuration}s | total=${totalDuration}s | response="${data.response?.trim()}"`);
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

        console.log('[VoiceAI] Final value for', fieldMeta.name, ':', finalValue);
        return { status: 'DONE', field: fieldMeta.name, value: finalValue };
    } catch (error) {
        console.error('[VoiceAI] LLM Error:', error);
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
