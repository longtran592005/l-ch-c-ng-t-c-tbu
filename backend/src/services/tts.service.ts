/**
 * TTS Service - Giao tiếp với Python TTS Service (Sử dụng Edge-TTS cho giọng Bắc chuẩn)
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Schedule } from '@prisma/client';

const XTTS_SERVICE_URL = process.env.XTTS_SERVICE_URL || 'http://localhost:8003';
const TTS_OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'tts');
const TTS_REQUEST_TIMEOUT = 30000;

export type VoiceType = 'male' | 'female';

export interface TTSResult {
  success: boolean;
  audioUrl?: string;
  duration?: number;
  error?: string;
}

export interface TTSSyncProgress {
  isSyncing: boolean;
  current: number;
  total: number;
  startTime?: Date;
  status: string;
}

export const ttsService = {
  // Trạng thái đồng bộ toàn cục
  syncProgress: {
    isSyncing: false,
    current: 0,
    total: 0,
    status: 'idle'
  } as TTSSyncProgress,
  /**
   * Format lịch công tác thành văn bản trang trọng
   */
  formatScheduleText(schedule: Schedule): string {
    const parts: string[] = [];
    parts.push('Kính chào quý vị.');

    // Xử lý ngày tháng (đảm bảo không bị lệch múi giờ khi convert từ Prisma Date)
    const d = new Date(schedule.date);
    // Lấy thông tin ngày theo UTC vì Prisma lưu Date (SQL Server) thành 00:00:00 UTC
    // Nếu dùng GetDay/GetDate thông thường sẽ bị lệch 1 ngày tùy vào múi giờ server
    const day = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    const weekdayIdx = d.getUTCDay();
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    parts.push(`Sau đây là lịch công tác cho ${weekdays[weekdayIdx]}, ngày ${day} tháng ${month} năm ${year}.`);

    if (schedule.startTime) {
      let timeStr = "";
      if (typeof schedule.startTime === 'string') {
        timeStr = schedule.startTime;
      } else {
        // Prisma trả về đối tượng Date cho kiểu TIME, ta lấy UTC để tránh lệch múi giờ
        const h = schedule.startTime.getUTCHours().toString().padStart(2, '0');
        const m = schedule.startTime.getUTCMinutes().toString().padStart(2, '0');
        timeStr = `${h}:${m}`;
      }

      if (schedule.endTime) {
        let endTimeStr = "";
        if (typeof schedule.endTime === 'string') {
          endTimeStr = schedule.endTime;
        } else {
          const h = schedule.endTime.getUTCHours().toString().padStart(2, '0');
          const m = schedule.endTime.getUTCMinutes().toString().padStart(2, '0');
          endTimeStr = `${h}:${m}`;
        }
        parts.push(`Diễn ra từ ${timeStr} đến ${endTimeStr}.`);
      } else {
        parts.push(`Bắt đầu lúc ${timeStr}.`);
      }
    }

    if (schedule.content) parts.push(`Nội dung: ${schedule.content}.`);
    if (schedule.location) parts.push(`Tại địa điểm: ${schedule.location}.`);
    if (schedule.leader) parts.push(`Do ${schedule.leader} chủ trì.`);

    parts.push('Xin trân trọng cảm ơn!');
    return parts.join(' ');
  },

  async generateAudio(schedule: Schedule, voiceType: VoiceType): Promise<TTSResult> {
    try {
      const text = this.formatScheduleText(schedule);
      console.log(`[TTS] Requesting ${voiceType} voice for schedule ${schedule.id}`);

      const response = await axios.post(`${XTTS_SERVICE_URL}/synthesize`, {
        text,
        voice_type: voiceType,
        schedule_id: schedule.id
      }, { timeout: TTS_REQUEST_TIMEOUT });

      return { success: response.data.success, audioUrl: response.data.audio_url };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async generateAllVoices(schedule: Schedule): Promise<{ male: TTSResult; female: TTSResult }> {
    const [male, female] = await Promise.all([
      this.generateAudio(schedule, 'male'),
      this.generateAudio(schedule, 'female')
    ]);
    return { male, female };
  },

  getAudioUrl(scheduleId: string, voiceType: VoiceType): string | null {
    // Ép buộc tên file khác nhau hoàn toàn: male_id và female_id
    const fileName = `schedule_${scheduleId}.mp3`;
    const filePath = path.join(TTS_OUTPUT_DIR, voiceType, fileName);

    if (fs.existsSync(filePath)) {
      return `/uploads/tts/${voiceType}/${fileName}?t=${Date.now()}`;
    }
    return null;
  },

  hasAllAudio(scheduleId: string): { male: boolean; female: boolean } {
    const fileName = `schedule_${scheduleId}.mp3`;
    return {
      male: fs.existsSync(path.join(TTS_OUTPUT_DIR, 'male', fileName)),
      female: fs.existsSync(path.join(TTS_OUTPUT_DIR, 'female', fileName))
    };
  },

  async deleteAudio(scheduleId: string): Promise<void> {
    const fileName = `schedule_${scheduleId}.mp3`;
    const files = [
      path.join(TTS_OUTPUT_DIR, 'male', fileName),
      path.join(TTS_OUTPUT_DIR, 'female', fileName)
    ];
    files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  },

  async clearAllAudio(): Promise<void> {
    const dirs = [
      path.join(TTS_OUTPUT_DIR, 'male'),
      path.join(TTS_OUTPUT_DIR, 'female')
    ];

    dirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.endsWith('.mp3')) {
            fs.unlinkSync(path.join(dir, file));
          }
        });
      }
    });
    console.log('[TTS] Cleared all audio files');
  },

  async checkHealth() {
    try {
      await axios.get(`${XTTS_SERVICE_URL}/health`, { timeout: 2000 });
      return { available: true, modelLoaded: true };
    } catch {
      return { available: false, modelLoaded: false };
    }
  },

  async getAvailableVoices() {
    return [
      { id: 'male', name: 'Giọng Nam Miền Bắc', available: true },
      { id: 'female', name: 'Giọng Nữ Miền Bắc', available: true }
    ];
  },

  async warmupModel(): Promise<boolean> {
    try {
      await axios.post(`${XTTS_SERVICE_URL}/warmup`, {}, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
};

export default ttsService;
