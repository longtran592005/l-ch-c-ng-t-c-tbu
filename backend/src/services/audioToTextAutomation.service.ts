/**
 * Service để tự động hóa việc chuyển đổi audio sang text
 * Sử dụng Puppeteer để mô phỏng hành động của người dùng trên trang web daotao.abaii.vn
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/errors.util';

const ABAII_URL = process.env.ABAII_URL || 'https://daotao.abaii.vn/#/tockyat-fileat';
const MAX_WAIT_TIME = 300000; // 5 phút timeout
const POLL_INTERVAL = 2000; // Kiểm tra mỗi 2 giây

interface ConversionResult {
  success: boolean;
  text?: string;
  error?: string;
  processingTime?: number;
}

/**
 * Queue để xử lý tuần tự các request (vì Puppeteer chỉ có thể xử lý một request tại một thời điểm)
 */
interface QueueItem {
  filePath: string;
  originalFilename: string;
  resolve: (result: ConversionResult) => void;
  reject: (error: Error) => void;
}

let conversionQueue: QueueItem[] = [];
let isProcessing = false;

/**
 * Tạo browser instance (singleton để tái sử dụng)
 */
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true, // Chạy ở chế độ headless (không hiển thị browser)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

/**
 * Xử lý queue
 */
async function processQueue() {
  if (isProcessing || conversionQueue.length === 0) {
    return;
  }

  isProcessing = true;
  const item = conversionQueue.shift();

  if (!item) {
    isProcessing = false;
    return;
  }

  try {
    console.log(`[AudioToText] Processing queue item: ${item.originalFilename} (${conversionQueue.length} items remaining)`);
    const result = await convertAudioToTextAutomationInternal(item.filePath, item.originalFilename);
    item.resolve(result);
  } catch (error: any) {
    item.reject(error);
  } finally {
    isProcessing = false;
    // Xử lý item tiếp theo
    processQueue();
  }
}

/**
 * Đóng browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Tìm element trên trang web với nhiều selector khả dĩ
 */
async function findElement(page: Page, selectors: string[]): Promise<any> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        return element;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  return null;
}

/**
 * Chờ element xuất hiện
 */
async function waitForElement(
  page: Page,
  selectors: string[],
  timeout: number = 30000
): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = await findElement(page, selectors);
    if (element) {
      return element;
    }
    await page.waitForTimeout(1000);
  }
  return null;
}

/**
 * Upload file audio và lấy kết quả văn bản
 * Sử dụng queue để xử lý tuần tự
 */
export async function convertAudioToTextAutomation(
  filePath: string,
  originalFilename: string
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    conversionQueue.push({
      filePath,
      originalFilename,
      resolve,
      reject,
    });
    processQueue();
  });
}

/**
 * Hàm thực tế để chuyển đổi audio sang text (internal)
 */
async function convertAudioToTextAutomationInternal(
  filePath: string,
  originalFilename: string
): Promise<ConversionResult> {
  const startTime = Date.now();
  let page: Page | null = null;

  try {
    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      throw new AppError('Audio file not found.', 400);
    }

    // Lấy browser instance
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set timeout
    page.setDefaultTimeout(60000);

    console.log(`[AudioToText] Navigating to ${ABAII_URL}`);
    await page.goto(ABAII_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Chờ trang load xong
    await page.waitForTimeout(3000);

    console.log('[AudioToText] Looking for upload button...');
    
    // Tìm và click nút upload theo selector chính xác
    const uploadButtonSelectors = [
      'button#uploadButton',
      'button.action-button',
      'button[title*="Tải lên"]',
      'button[title*="upload"]',
      '#uploadButton',
      '.action-button',
    ];

    let uploadButton = null;
    for (const selector of uploadButtonSelectors) {
      try {
        uploadButton = await page.$(selector);
        if (uploadButton) {
          console.log(`[AudioToText] Found upload button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    if (!uploadButton) {
      throw new AppError('Không tìm thấy nút upload trên trang web. Vui lòng kiểm tra cấu trúc trang web.', 500);
    }

    // Click nút upload để mở file dialog
    console.log('[AudioToText] Clicking upload button...');
    await uploadButton.click();
    await page.waitForTimeout(2000); // Chờ dialog mở

    // Tìm input file sau khi click button
    const fileInputSelectors = [
      'input[type="file"]',
      'input[accept*="audio"]',
      'input[accept*="video"]',
      'input[accept*=".mp3"]',
      'input[accept*=".wav"]',
      'input[accept*=".mp4"]',
    ];

    console.log('[AudioToText] Looking for file input after button click...');
    const fileInput = await waitForElement(page, fileInputSelectors, 10000);

    if (!fileInput) {
      throw new AppError('Không tìm thấy input file upload sau khi click button. Có thể trang web đã thay đổi cấu trúc.', 500);
    }

    // Upload file
    console.log('[AudioToText] Uploading file...');
    const inputElement = await page.$(fileInputSelectors[0]);
    if (!inputElement) {
      throw new AppError('Không thể tìm thấy input element để upload file.', 500);
    }
    
    await inputElement.uploadFile(filePath);
    console.log('[AudioToText] File uploaded successfully');

    console.log('[AudioToText] File uploaded, waiting for processing...');

    // Chờ xử lý - tìm các dấu hiệu:
    // 1. Loading indicator biến mất
    // 2. Kết quả văn bản xuất hiện
    // 3. Button "Download" hoặc "Copy" xuất hiện

    // Chờ file được xử lý và văn bản xuất hiện
    console.log('[AudioToText] Waiting for text to be generated...');
    
    // Chờ cho đến khi văn bản xuất hiện (không còn placeholder)
    const textReady = await page.waitForFunction(
      () => {
        // Kiểm tra polishedNote (ghi chép đã trau chuốt - ưu tiên)
        const polishedNote = document.querySelector('#polishedNote');
        if (polishedNote) {
          const text = polishedNote.textContent || polishedNote.innerText || '';
          // Kiểm tra xem có text thực sự không (không phải placeholder)
          if (text && 
              text.trim().length > 50 && 
              !text.includes('Ghi chép đã trau chuốt của bạn sẽ xuất hiện ở đây') &&
              !text.includes('Ghi chép nguyên văn sẽ xuất hiện ở đây')) {
            return true;
          }
        }
        
        // Kiểm tra rawTranscription (ghi chép nguyên văn)
        const rawTranscription = document.querySelector('#rawTranscription');
        if (rawTranscription) {
          const text = rawTranscription.textContent || rawTranscription.innerText || '';
          if (text && 
              text.trim().length > 50 && 
              !text.includes('Ghi chép đã trau chuốt của bạn sẽ xuất hiện ở đây') &&
              !text.includes('Ghi chép nguyên văn sẽ xuất hiện ở đây')) {
            return true;
          }
        }
        
        return false;
      },
      {
        timeout: MAX_WAIT_TIME,
        polling: 2000, // Kiểm tra mỗi 2 giây
      }
    ).catch(() => null);

    if (!textReady) {
      throw new AppError('Timeout: Văn bản không được tạo ra trong thời gian cho phép. Có thể file quá lớn hoặc có lỗi xảy ra.', 500);
    }

    // Lấy văn bản từ polishedNote (ưu tiên) hoặc rawTranscription
    console.log('[AudioToText] Extracting text from page...');
    const text = await page.evaluate(() => {
      // Ưu tiên lấy từ polishedNote (ghi chép đã trau chuốt)
      const polishedNote = document.querySelector('#polishedNote');
      if (polishedNote) {
        const text = polishedNote.textContent || polishedNote.innerText || '';
        if (text && 
            text.trim().length > 50 && 
            !text.includes('Ghi chép đã trau chuốt của bạn sẽ xuất hiện ở đây')) {
          return text.trim();
        }
      }
      
      // Nếu không có polishedNote, lấy từ rawTranscription
      const rawTranscription = document.querySelector('#rawTranscription');
      if (rawTranscription) {
        const text = rawTranscription.textContent || rawTranscription.innerText || '';
        if (text && 
            text.trim().length > 50 && 
            !text.includes('Ghi chép nguyên văn sẽ xuất hiện ở đây')) {
          return text.trim();
        }
      }
      
      // Fallback: lấy từ bất kỳ note-content nào
      const noteContents = document.querySelectorAll('.note-content');
      for (const note of Array.from(noteContents)) {
        const text = (note as HTMLElement).textContent || (note as HTMLElement).innerText || '';
        if (text && 
            text.trim().length > 50 && 
            !text.includes('Ghi chép') && 
            !text.includes('xuất hiện ở đây')) {
          return text.trim();
        }
      }
      
      return '';
    });

    if (!text || text.trim().length === 0) {
      throw new AppError('Kết quả văn bản trống. Có thể file audio không được xử lý thành công.', 500);
    }

    const processingTime = Math.round((Date.now() - startTime) / 1000);

    console.log(`[AudioToText] Successfully extracted text (${text.length} characters) in ${processingTime}s`);

    return {
      success: true,
      text: text.trim(),
      processingTime,
    };

  } catch (error: any) {
    console.error('[AudioToText] Error:', error);
    return {
      success: false,
      error: error.message || 'Có lỗi xảy ra khi chuyển đổi audio sang text.',
    };
  } finally {
    // Đóng page nhưng giữ browser để tái sử dụng
    if (page) {
      await page.close();
    }
  }
}

/**
 * Cleanup function để đóng browser khi server shutdown
 */
process.on('SIGTERM', async () => {
  await closeBrowser();
});

process.on('SIGINT', async () => {
  await closeBrowser();
});

