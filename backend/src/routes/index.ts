import { Router } from 'express';
import authRoutes from '../modules/auth/routes.js';
import applicationRoutes from '../modules/applications/routes.js';
import contactRoutes from '../modules/contacts/routes.js';
import emailRoutes from '../modules/email/routes.js';
import analyticsRoutes from '../modules/analytics/routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/applications', applicationRoutes);
router.use('/applications/:id/contacts', contactRoutes);
router.use('/email', emailRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
