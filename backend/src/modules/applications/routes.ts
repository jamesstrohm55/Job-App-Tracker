import { Router } from 'express';
import * as applicationController from './controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsQuery,
  applicationIdParam,
  createTimelineEventSchema,
} from './schemas.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate({ query: listApplicationsQuery }),
  asyncHandler(applicationController.list),
);

router.get(
  '/:id',
  validate({ params: applicationIdParam }),
  asyncHandler(applicationController.get),
);

router.post(
  '/',
  validate({ body: createApplicationSchema }),
  asyncHandler(applicationController.create),
);

router.patch(
  '/:id',
  validate({ params: applicationIdParam, body: updateApplicationSchema }),
  asyncHandler(applicationController.update),
);

router.delete(
  '/:id',
  validate({ params: applicationIdParam }),
  asyncHandler(applicationController.remove),
);

// Timeline sub-routes
router.get(
  '/:id/timeline',
  validate({ params: applicationIdParam }),
  asyncHandler(applicationController.getTimeline),
);

router.post(
  '/:id/timeline',
  validate({ params: applicationIdParam, body: createTimelineEventSchema }),
  asyncHandler(applicationController.addTimelineEvent),
);

export default router;
