import { Router } from 'express';
import healthRouter from './health.route';
import authRouter from './auth.route';
import scheduleRouter from './schedule.route';
import newsRouter from './news.route';
import announcementRouter from './announcement.route';
import userRouter from './user.route';
import meetingRecordRouter from './meetingRecord.route';
import whisperSimpleRouter from './whisperSimple.route';
import chatbotRouter from './chatbot.route';
// import audioToTextRouter from './audioToText.route'; // DEPRECATED: Using simple whisper instead

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use(scheduleRouter);
apiRouter.use(newsRouter);
apiRouter.use(announcementRouter);
apiRouter.use(meetingRecordRouter);
apiRouter.use('/whisper', whisperSimpleRouter);
apiRouter.use('/chatbot', chatbotRouter);
// apiRouter.use(audioToTextRouter); // DEPRECATED: Using simple whisper instead
apiRouter.use(userRouter);

export default apiRouter;
