import { Request, Response, NextFunction } from 'express';
import { llmService } from '../services/llm.service';

export const aiController = {
    processVoiceData: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { prompt, model, temperature } = req.body;

            if (!prompt) {
                return res.status(400).json({ message: 'Prompt is required' });
            }

            const result = await llmService.processPrompt(prompt, model, temperature);

            // Trả về đúng format mà Frontend đang mong đợi (để đỡ phải sửa frontend nhiều)
            res.json({
                response: result,
                done: true
            });
        } catch (error) {
            next(error);
        }
    }
};
