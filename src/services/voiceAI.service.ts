/**
 * Voice AI Service v7.0 — Client-side Fast Parser + LLM Fallback
 * Tối ưu tốc độ: Parse date/time/eventType TẠI CLIENT (instant ~0ms).
 * Chỉ gọi LLM cho các trường phức tạp (content, location, participants, v.v.).
 */

import { ScheduleEventType } from '@/types';
import { getApiBaseUrl } from '@/lib/utils';

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

// ============================================================
// CLIENT-SIDE FAST PARSER — Instant, no network call needed
// ============================================================

/** Map Vietnamese number words to digits */
const VIET_NUMBERS: Record<string, number> = {
    'không': 0, 'linh': 0, 'lẻ': 0,
    'một': 1, 'mốt': 1, 'mot': 1,
    'hai': 2,
    'ba': 3,
    'bốn': 4, 'tư': 4,
    'năm': 5, 'lăm': 5, 'nam': 5,
    'sáu': 6, 'sau': 6,
    'bảy': 7, 'bay': 7,
    'tám': 8, 'tam': 8,
    'chín': 9, 'chin': 9,
    'mười': 10, 'muoi': 10, 'mươi': 10,
};

/** Convert a Vietnamese word sequence to a number, e.g. "mười lăm" → 15, "hai mươi ba" → 23 */
function viWordToNumber(text: string): number | null {
    const t = text.trim().toLowerCase();

    // Already a digit string?
    if (/^\d+$/.test(t)) return parseInt(t, 10);

    // Single word lookup
    if (VIET_NUMBERS[t] !== undefined) return VIET_NUMBERS[t];

    // "mười X" → 10 + X  (mười một = 11, mười lăm = 15)
    const muoiMatch = t.match(/^mười\s+(.+)$/);
    if (muoiMatch) {
        const units = VIET_NUMBERS[muoiMatch[1].trim()];
        if (units !== undefined) return 10 + units;
    }

    // "X mươi Y" → X*10 + Y  (hai mươi ba = 23)
    const fullMatch = t.match(/^(\S+)\s+mươi(?:\s+(.+))?$/);
    if (fullMatch) {
        const tens = VIET_NUMBERS[fullMatch[1]];
        if (tens !== undefined) {
            const unitsPart = fullMatch[2]?.trim();
            const units = unitsPart ? (VIET_NUMBERS[unitsPart] ?? null) : 0;
            if (units !== null) return tens * 10 + units;
        }
    }

    return null;
}

/** Clean filler words from Vietnamese voice transcript */
function cleanTranscript(text: string): string {
    return text
        .replace(/\b(ờ|à|ừm|ừ|giúp tôi|cho tôi|làm ơn|đăng ký|hết|xong|kết thúc|nhé|nha|ạ|vâng)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Try to parse a DATE from Vietnamese voice text. Returns YYYY-MM-DD or null. */
function parseDate(raw: string): string | null {
    // Strip trailing punctuation (dots, commas) from Viettel STT output
    const text = cleanTranscript(raw).replace(/[.,!?]+$/g, '').trim().toLowerCase();
    const today = new Date();
    const year = today.getFullYear();

    // "hôm nay"
    if (/hôm\s*nay/.test(text)) {
        return formatDateStr(today);
    }
    // "ngày mai"
    if (/ngày\s*mai/.test(text)) {
        const d = new Date(today); d.setDate(d.getDate() + 1);
        return formatDateStr(d);
    }
    // "ngày kia" / "ngày mốt"
    if (/ngày\s*(kia|mốt)/.test(text)) {
        const d = new Date(today); d.setDate(d.getDate() + 2);
        return formatDateStr(d);
    }

    // Pattern: DD/MM/YYYY or DD-MM-YYYY (Viettel often returns "7/3/2026")
    const fullDateRegex = /(?:ngày\s+)?(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4})/i;
    const fm = text.match(fullDateRegex);
    if (fm) {
        const day = parseInt(fm[1], 10);
        const month = parseInt(fm[2], 10);
        const yr = parseInt(fm[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && yr >= 2000 && yr <= 2100) {
            return `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    // Pattern: "ngày 15 tháng 6", "15/6", "15-6", "ngày 15/6" (no year)
    const dateRegex = /(?:ngày\s+)?(\d{1,2})\s*([/-]|tháng)\s*(\d{1,2})/i;
    const m = text.match(dateRegex);
    if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[3], 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    // Pattern with word numbers: "ngày mười lăm tháng sáu"
    const wordDateRegex = /(?:ngày\s+)(.+?)\s+tháng\s+(.+?)(?:\s|$)/i;
    const wm = text.match(wordDateRegex);
    if (wm) {
        const day = viWordToNumber(wm[1]);
        const month = viWordToNumber(wm[2]);
        if (day && month && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    return null;
}

/** Try to parse a TIME from Vietnamese voice text. Returns HH:mm or null. */
function parseTime(raw: string): string | null {
    // Strip trailing punctuation (dots, commas) from Viettel STT output
    const text = cleanTranscript(raw).replace(/[.,!?]+$/g, '').trim().toLowerCase();

    // Detect AM/PM modifier: "sáng" = morning, "chiều/tối" = afternoon/evening
    const isMorning = /sáng/.test(text);
    const isPM = /chiều|tối/.test(text);

    // Pattern 1: Direct digits "08:30", "8:30", "14:00"
    const colonMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (colonMatch) {
        let h = parseInt(colonMatch[1], 10);
        const min = parseInt(colonMatch[2], 10);
        if (isPM && h < 12) h += 12;
        if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
            return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        }
    }

    // Pattern 2: "8 giờ 30", "8h30", "8 giờ 30 phút"
    const fullTimeRegex = /(\d{1,2})\s*(?:giờ|h)\s*(\d{1,2})\s*(?:phút)?/;
    const ft = text.match(fullTimeRegex);
    if (ft) {
        let h = parseInt(ft[1], 10);
        const min = parseInt(ft[2], 10);
        if (isPM && h < 12) h += 12;
        if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
            return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        }
    }

    // Pattern 3: "8 giờ rưỡi" → 08:30
    const halfRegex = /(\d{1,2})\s*(?:giờ|h)\s*rưỡi/;
    const hf = text.match(halfRegex);
    if (hf) {
        let h = parseInt(hf[1], 10);
        if (isPM && h < 12) h += 12;
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:30`;
    }

    // Pattern 4: "8 giờ" (no minutes)
    const hourOnlyRegex = /(\d{1,2})\s*(?:giờ|h)\b/;
    const ho = text.match(hourOnlyRegex);
    if (ho) {
        let h = parseInt(ho[1], 10);
        if (isPM && h < 12) h += 12;
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    }

    // Pattern 5: Vietnamese word hours → "tám giờ ba mươi" → 08:30
    // Try word-based: "<word> giờ [<word> [phút]]"
    const wordTimeRegex = /(.+?)\s*(?:giờ|h)\s*(.*?)(?:\s*phút)?$/;
    const wt = text.match(wordTimeRegex);
    if (wt) {
        const hourWord = wt[1].replace(/^.*?\b/, '').trim(); // take last word group before giờ
        let h = viWordToNumber(hourWord);
        if (h === null) {
            // Try just the last word
            const words = wt[1].trim().split(/\s+/);
            h = viWordToNumber(words[words.length - 1]) ?? viWordToNumber(words.slice(-2).join(' '));
        }
        if (h !== null && h >= 0 && h <= 23) {
            if (isPM && h < 12) h += 12;
            const minPart = wt[2]?.trim();
            let min = 0;
            if (minPart) {
                if (minPart === 'rưỡi') {
                    min = 30;
                } else {
                    const parsedMin = viWordToNumber(minPart);
                    if (parsedMin !== null && parsedMin >= 0 && parsedMin <= 59) min = parsedMin;
                }
            }
            return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        }
    }

    // Pattern 6: bare number "14" or "8" (treat as hour)
    const bareNumber = text.match(/^(\d{1,2})$/);
    if (bareNumber) {
        let h = parseInt(bareNumber[1], 10);
        if (isPM && h < 12) h += 12;
        if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    }

    return null;
}

/** Try to parse eventType from Vietnamese voice text. Returns enum value or null. */
function parseEventType(raw: string): string | null {
    const text = cleanTranscript(raw).toLowerCase();
    if (/hội\s*nghị/.test(text)) return 'hoi_nghi';
    if (/tạm\s*ngưng|hoãn|hủy/.test(text)) return 'tam_ngung';
    if (/cuộc\s*họp|họp/.test(text)) return 'cuoc_hop';
    return null;
}

function formatDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Fast client-side parser. Returns parsed value instantly or null if cannot parse.
 * Handles: date, startTime, endTime, eventType.
 */
export function tryLocalParse(transcript: string, fieldMeta: FieldMetadata): any | null {
    switch (fieldMeta.name) {
        case 'date':
            return parseDate(transcript);
        case 'startTime':
        case 'endTime':
            return parseTime(transcript);
        case 'eventType':
            return parseEventType(transcript);
        default:
            return null; // Complex fields → use LLM
    }
}

// ============================================================
// LLM FALLBACK — Only for complex text fields
// ============================================================

const VOICE_SYSTEM_PROMPT = `Chuyển transcript STT thô → GIÁ TRỊ CHUẨN cho trường: {{FIELD_NAME}} ({{FIELD_TYPE}})
Bạn là bộ lọc dữ liệu hành chính Trường ĐH Thái Bình. Lọc nhiễu STT, trả giá trị sạch.

QUY TẮC:
- date: YYYY-MM-DD | time: HH:mm (24h) | enum: chỉ trả ID từ {{ENUM_IDS}}
- array: ngăn cách bằng dấu phẩy
- location: ép/ét/f/e→F, hờ/h→H + ghép số ("phòng ép hai linh tám"→F208)
- Từ điển TBU: Đào tạo→Phòng Đào tạo, Hành chính→Phòng HC-TH, Kế hoạch→Phòng KH-TC, Tổ chức→Phòng TCCB
- Viết hoa tên riêng, tên phòng/khoa
- CHỈ TRẢ GIÁ TRỊ THUẦN. Không giải thích. Rác→chuỗi rỗng.`;

const AI_PROXY_URL_FACTORY = () => `${getApiBaseUrl()}/ai/process`;

async function processWithLLM(transcript: string, fieldMeta: FieldMetadata, provider: string = 'opencode'): Promise<VoiceProcessingResult> {
    let enumIds = "";
    if (fieldMeta.type === 'enum' && fieldMeta.enumValues) {
        enumIds = fieldMeta.enumValues.map(e => e.value).join(', ');
    }

    const systemPrompt = VOICE_SYSTEM_PROMPT
        .replace('{{FIELD_NAME}}', fieldMeta.name)
        .replace('{{FIELD_TYPE}}', fieldMeta.type)
        .replace('{{ENUM_IDS}}', enumIds);

    try {
        const providerLabel = provider === 'pollinations' ? 'Pollinations' : 'OpenCode';
        console.log(`[VoiceAI/${providerLabel}] LLM processing:`, transcript, 'for field:', fieldMeta.name);
        const t0 = performance.now();

        const token = localStorage.getItem('tbu_auth_token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(AI_PROXY_URL_FACTORY(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                system: systemPrompt,
                prompt: transcript,
                temperature: 0.1,
                max_tokens: 100,
                provider: provider,
            })
        });

        const networkDuration = ((performance.now() - t0) / 1000).toFixed(2);

        if (!response.ok) {
            console.error(`[VoiceAI/${providerLabel}] API error:`, response.status, response.statusText);
            return { status: 'DONE', field: fieldMeta.name, value: null };
        }

        const data = await response.json();
        const totalDuration = ((performance.now() - t0) / 1000).toFixed(2);
        console.log(`⏱️ [VoiceAI/${providerLabel}] field="${fieldMeta.name}" | total=${totalDuration}s | response="${data.response?.trim()}"`);
        let aiResult = data.response?.trim() || "";

        aiResult = aiResult.replace(/```json|```/g, '').trim();

        if (aiResult.toLowerCase() === 'null' || !aiResult) {
            return { status: 'DONE', field: fieldMeta.name, value: null };
        }

        let finalValue: any = aiResult;

        if (fieldMeta.type === 'array') {
            try {
                if (aiResult.startsWith('[') && aiResult.endsWith(']')) {
                    finalValue = JSON.parse(aiResult);
                } else {
                    finalValue = [aiResult.replace(/"/g, '')];
                }
            } catch {
                finalValue = [aiResult.replace(/"/g, '')];
            }
        } else {
            if (finalValue.startsWith('"') && finalValue.endsWith('"')) {
                finalValue = finalValue.substring(1, finalValue.length - 1);
            }
        }

        console.log('[VoiceAI] LLM result for', fieldMeta.name, ':', finalValue);
        return { status: 'DONE', field: fieldMeta.name, value: finalValue };
    } catch (error) {
        console.error('[VoiceAI] LLM Error:', error);
        return { status: 'DONE', field: fieldMeta.name, value: null };
    }
}

// ============================================================
// MAIN ENTRY — Fast parse first, LLM fallback
// ============================================================

export async function processVoiceInput(transcript: string, currentField: ScheduleField, provider: string = 'opencode'): Promise<VoiceProcessingResult> {
    const fieldMeta = SCHEDULE_FIELDS.find(f => f.name === currentField);
    if (!fieldMeta) return { status: 'DONE' };

    // 1) Try instant client-side parse (date, time, eventType)
    const t0 = performance.now();
    const localValue = tryLocalParse(transcript, fieldMeta);
    if (localValue !== null) {
        const ms = (performance.now() - t0).toFixed(1);
        console.log(`⚡ [VoiceAI/LOCAL] field="${currentField}" | ${ms}ms | "${transcript}" → "${localValue}"`);
        return { status: 'DONE', field: currentField, value: localValue };
    }

    // 2) Fallback to LLM for complex fields
    console.log(`🌐 [VoiceAI] field="${currentField}" → LLM fallback (no local parse)`);
    return await processWithLLM(transcript, fieldMeta, provider);
}

export function getNextField(currentField: ScheduleField): ScheduleField | null {
    const idx = SCHEDULE_FIELDS.findIndex(f => f.name === currentField);
    return idx < SCHEDULE_FIELDS.length - 1 ? SCHEDULE_FIELDS[idx + 1].name : null;
}

export function getFieldMetadata(field: ScheduleField): FieldMetadata | undefined {
    return SCHEDULE_FIELDS.find(f => f.name === field);
}
