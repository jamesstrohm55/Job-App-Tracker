import type { Request, Response } from 'express';
import * as emailService from './service.js';
import { config } from '../../config/index.js';
import type { ApiResponse } from '../../types/common.js';

export async function connect(_req: Request, res: Response): Promise<void> {
  const url = emailService.getConnectUrl();
  res.redirect(url);
}

export async function callback(req: Request, res: Response): Promise<void> {
  const code = req.query['code'] as string | undefined;

  if (!code) {
    res.redirect(`${config.FRONTEND_URL}/settings?error=missing_code`);
    return;
  }

  await emailService.handleCallback(req.user!.userId, code);
  res.redirect(`${config.FRONTEND_URL}/settings?gmail=connected`);
}

export async function status(req: Request, res: Response): Promise<void> {
  const result = await emailService.getStatus(req.user!.userId);

  const body: ApiResponse<typeof result> = {
    success: true,
    data: result,
  };
  res.json(body);
}

export async function sync(req: Request, res: Response): Promise<void> {
  const result = await emailService.syncEmails(req.user!.userId);

  const body: ApiResponse<typeof result> = {
    success: true,
    data: result,
  };
  res.json(body);
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  await emailService.disconnect(req.user!.userId);

  const body: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Gmail disconnected' },
  };
  res.json(body);
}
