import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Constants config
const WHISPER_SERVICE_URL = 'http://localhost:8081';
const RAG_SERVICE_URL = 'http://localhost:8002';

export const proxyController = {
    /**
     * Proxy for Whisper Service (Audio Transcription)
     * Forward multipart/form-data request to Python Service
     */
    proxyWhisper: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            console.log(`[Proxy] Forwarding audio to ${WHISPER_SERVICE_URL}/transcribe...`);

            // Prepare form data for forwarded request
            const form = new FormData();
            form.append('file', fs.createReadStream(req.file.path));

            // Append other fields if necessary, e.g., language
            if (req.body.language) {
                form.append('language', req.body.language);
            }

            // Call Python Service
            const response = await axios.post(`${WHISPER_SERVICE_URL}/transcribe`, form, {
                headers: {
                    ...form.getHeaders(),
                    // Don't forward original host header, let axios handle it
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            // Cleanup uploaded file
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });

            // Return response
            res.json(response.data);

        } catch (error: any) {
            // Cleanup uploaded file on error too
            if (req.file) {
                fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting temp file:', err); });
            }

            console.error('[Proxy] Whisper Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                return res.status(503).json({ message: 'Whisper Service (8081) is unavailable' });
            }
            res.status(error.response?.status || 500).json(error.response?.data || { message: 'Proxy Error' });
        }
    },

    /**
     * Proxy for RAG Service
     * Forward JSON request to Python Service
     */
    proxyRag: async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Get the path suffix (e.g., /query, /index)
            // client calls /api/proxy/rag/query -> req.path might be just /query depending on router mount
            // We will assume the router mounts at /api/proxy/rag, so req.url is the subpath

            const subPath = req.url; // e.g., /query
            const targetUrl = `${RAG_SERVICE_URL}${subPath}`;

            console.log(`[Proxy] Forwarding RAG request to ${targetUrl}...`);

            const response = await axios({
                method: req.method,
                url: targetUrl,
                data: req.body,
                params: req.query,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            res.status(response.status).json(response.data);

        } catch (error: any) {
            console.error('[Proxy] RAG Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                return res.status(503).json({ message: 'RAG Service (8002) is unavailable' });
            }
            res.status(error.response?.status || 500).json(error.response?.data || { message: 'Proxy Error' });
        }
    }
};
