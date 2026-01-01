import { Router } from 'express';
import healthRouter from './health.route';
import authRouter from './auth.route';
import scheduleRouter from './schedule.route'; // Import scheduleRouter
import newsRouter from './news.route';
import announcementRouter from './announcement.route';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use(scheduleRouter); // Mount scheduleRouter
apiRouter.use(newsRouter);
apiRouter.use(announcementRouter);

export default apiRouter;
