import { Request, Response, NextFunction } from 'express';
import { llmService } from '../services/llm.service';

export const aiController = {
    processVoiceData: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { system, prompt, model, temperature, provider, max_tokens } = req.body;

            if (!prompt) {
                return res.status(400).json({ message: 'Prompt is required' });
            }

            // provider: 'opencode' (default) | 'pollinations'
            const result = await llmService.processPrompt(prompt, model, temperature, provider || 'opencode', max_tokens, system);

            // Trả về đúng format mà Frontend đang mong đợi
            res.json({
                response: result,
                done: true
            });
        } catch (error) {
            next(error);
        }
    }
};
