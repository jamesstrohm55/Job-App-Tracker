import { Router } from 'express';
import * as contactController from './controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createContactSchema,
  updateContactSchema,
  contactParams,
  applicationIdParam,
} from './schemas.js';

// Mounted at /applications/:id/contacts
const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  '/',
  validate({ params: applicationIdParam }),
  asyncHandler(contactController.list),
);

router.get(
  '/:contactId',
  validate({ params: contactParams }),
  asyncHandler(contactController.get),
);

router.post(
  '/',
  validate({ params: applicationIdParam, body: createContactSchema }),
  asyncHandler(contactController.create),
);

router.patch(
  '/:contactId',
  validate({ params: contactParams, body: updateContactSchema }),
  asyncHandler(contactController.update),
);

router.delete(
  '/:contactId',
  validate({ params: contactParams }),
  asyncHandler(contactController.remove),
);

export default router;
