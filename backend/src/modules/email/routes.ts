import { Router } from 'express';
import * as emailController from './controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/connect', asyncHandler(emailController.connect));
router.get('/callback', asyncHandler(emailController.callback));
router.get('/status', asyncHandler(emailController.status));
router.post('/sync', asyncHandler(emailController.sync));
router.delete('/disconnect', asyncHandler(emailController.disconnect));

export default router;
