/**
 * RAG Service - Communicate with RAG Chatbot service
 * Auto reindex when data changes
 */
import https from 'https';

// RAG service URL - use HTTPS
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'https://localhost:8002';

// HTTPS Agent for self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Trigger RAG reindex for specific source type
 * @param sourceType - 'schedules' | 'news' | 'announcements' | 'document' | 'all'
 */
export const triggerRagReindex = async (sourceType: 'schedules' | 'news' | 'announcements' | 'document' | 'all' = 'all'): Promise<void> => {
  try {
    const endpoint = sourceType === 'all' ? '/reindex-all' : `/reindex/${sourceType}`;
    
    // Use fire-and-forget pattern - don't wait for response
    // Note: Using dynamic import for node-fetch with https agent
    const fetchUrl = `${RAG_SERVICE_URL}${endpoint}`;
    import('node-fetch').then(({ default: fetch }) => {
      return fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: httpsAgent as any,
      });
    }).then(response => {
      if (response.ok) {
        console.log(`[RAG] Reindex triggered for: ${sourceType}`);
      } else {
        console.warn(`[RAG] Reindex failed for: ${sourceType}`, response.status);
      }
    }).catch(err => {
      // RAG service might not be running - that's okay
      console.warn(`[RAG] Service not available: ${err.message}`);
    });
  } catch (error) {
    // Don't throw - RAG is optional
    console.warn('[RAG] Failed to trigger reindex:', error);
  }
};

/**
 * Clear RAG cache (useful after reindex)
 */
export const clearRagCache = async (): Promise<void> => {
  try {
    import('node-fetch').then(({ default: fetch }) => {
      return fetch(`${RAG_SERVICE_URL}/cache/clear`, {
        method: 'POST',
        agent: httpsAgent as any,
      });
    }).catch(() => {
      // Ignore errors
    });
  } catch (error) {
    // Ignore
  }
};

/**
 * Trigger reindex and clear cache
 */
export const triggerRagUpdate = async (sourceType: 'schedules' | 'news' | 'announcements' | 'document' | 'all' = 'all'): Promise<void> => {
  await triggerRagReindex(sourceType);
  await clearRagCache();
};
