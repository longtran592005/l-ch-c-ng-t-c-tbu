import { Router } from 'express';
import healthRouter from './health.route';
import authRouter from './auth.route';
import scheduleRouter from './schedule.route'; // Import scheduleRouter
import newsRouter from './news.route';
import announcementRouter from './announcement.route';
import userRouter from './user.route';
import meetingRecordRouter from './meetingRecord.route';
import audioToTextRouter from './audioToText.route'; // Import audio to text router

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use(scheduleRouter); // Mount scheduleRouter
apiRouter.use(newsRouter);
apiRouter.use(announcementRouter);
apiRouter.use(meetingRecordRouter);
apiRouter.use(audioToTextRouter); // Mount audio to text router
apiRouter.use(userRouter);

export default apiRouter;
