import { Router } from 'express';
import * as analyticsController from './controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { timelineQuery, timeInStageQuery } from './schemas.js';

const router = Router();

router.use(authenticate);

router.get('/summary', asyncHandler(analyticsController.summary));

router.get(
  '/timeline',
  validate({ query: timelineQuery }),
  asyncHandler(analyticsController.timeline),
);

router.get('/funnel', asyncHandler(analyticsController.funnel));

router.get(
  '/time-in-stage',
  validate({ query: timeInStageQuery }),
  asyncHandler(analyticsController.timeInStage),
);

export default router;
