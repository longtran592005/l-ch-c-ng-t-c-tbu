import { api } from './api'; // Assuming api.ts contains a configured axios instance or fetch wrapper

/**
 * Calls an AI API to generate text based on a given prompt.
 * This service can be configured to use OpenAI or a local LLM.
 *
 * @param prompt The text prompt to send to the AI.
 * @returns A promise that resolves with the AI-generated text.
 */
export async function callAIAPI(prompt: string): Promise<string> {
  // --- Configuration ---
  // You would typically get AI configuration (API key, base URL, model name)
  // from environment variables or a global config service.
  // For this example, we'll assume a /ai/generate endpoint is available
  // which internally handles the LLM interaction (OpenAI or local LLM).
  // This endpoint would be part of your backend.
  
  // Example using the project's 'api' service
  try {
    const response = await api.post<{ generatedText: string }>('/ai/generate-text', { prompt });
    return response.generatedText;
  } catch (error) {
    console.error('Error calling AI API:', error);
    // You might want to throw a more specific error or re-throw the original
    throw new Error('Failed to get response from AI. Please try again later.');
  }
}
