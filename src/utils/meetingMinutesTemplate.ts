import { format } from "date-fns";
import { vi } from 'date-fns/locale';

/**
 * Converts basic HTML content to a more readable plain text format, preserving common structures.
 * This is a simplified converter and might not handle all HTML complexities.
 * @param html The HTML string to convert.
 * @returns A plain text string.
 */
function convertHtmlToPlainText(html: string): string {
  // Use a DOMParser for more robust HTML to text conversion if running in a browser environment
  // or a server-side library like 'jsdom' if on Node.js.
  // For a simple utility without extra dependencies, we'll use regex for common cases.

  let text = html;

  // Replace block-level elements with newline characters
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n\n');
  text = text.replace(/<\/ol>/gi, '\n\n');
  text.replace(/<blockquote[^>]*>/gi, '\n\n> ');
  text.replace(/<\/blockquote>/gi, '\n\n');

  // Handle lists: Add a bullet for <li> items
  text = text.replace(/<li[^>]*>/gi, '  - '); // Indent list items

  // Remove other HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  const doc = new DOMParser().parseFromString(text, 'text/html');
  text = doc.documentElement.textContent || '';

  // Trim multiple newlines and spaces
  text = text.replace(/\n\s*\n/g, '\n\n'); // Reduce multiple empty lines
  text = text.replace(/^\s+|\s+$/g, ''); // Trim leading/trailing whitespace

  return text;
}

export function generateMinutesTemplate(
  content: string,
  meetingInfo: {
    title: string;
    date: Date;
    location?: string;
    leader?: string;
    participants?: string[];
  }
): string {
  const formattedDate = format(meetingInfo.date, 'dd/MM/yyyy', { locale: vi });
  const formattedTime = format(meetingInfo.date, 'HH:mm', { locale: vi });
  const participantsList = meetingInfo.participants && meetingInfo.participants.length > 0
    ? meetingInfo.participants.map(p => `- ${p}`).join('\n')
    : '- Không có';

  const formattedContent = convertHtmlToPlainText(content);

  const template = `BIÊN BẢN CUỘC HỌP

Tên cuộc họp: ${meetingInfo.title}
Thời gian: ${formattedDate} ${formattedTime}
Địa điểm: ${meetingInfo.location || 'Chưa xác định'}

Thành phần tham dự:
${participantsList}

NỘI DUNG CUỘC HỌP:
${formattedContent}

Người ghi biên bản: [Tên người ghi biên bản]
Ngày ghi: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}
`;

  return template;
}
