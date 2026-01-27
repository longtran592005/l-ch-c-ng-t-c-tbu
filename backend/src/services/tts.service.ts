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

export const ttsService = {
  /**
   * Format lịch công tác thành văn bản trang trọng
   */
  formatScheduleText(schedule: Schedule): string {
    const parts: string[] = [];
    parts.push('Kính chào quý vị.');
    const dateObj = new Date(schedule.date);
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    parts.push(`Sau đây là lịch công tác cho ${weekdays[dateObj.getDay()]}, ngày ${dateObj.getDate()} tháng ${dateObj.getMonth() + 1}.`);

    if (schedule.startTime) {
      const startTime = typeof schedule.startTime === 'string'
        ? schedule.startTime
        : new Date(schedule.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      parts.push(`Bắt đầu lúc ${startTime}.`);
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
