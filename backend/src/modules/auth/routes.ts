import { Router } from 'express';
import * as authController from './controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { refreshTokenSchema } from './schemas.js';

const router = Router();

router.get('/google', authLimiter, asyncHandler(authController.googleAuth));
router.get('/google/callback', asyncHandler(authController.googleCallback));

router.post(
  '/refresh',
  authLimiter,
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.refresh),
);

router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));

export default router;
