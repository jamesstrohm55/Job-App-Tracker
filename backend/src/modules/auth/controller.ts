import type { Request, Response } from 'express';
import * as authService from './service.js';
import { config } from '../../config/index.js';
import type { ApiResponse } from '../../types/common.js';
import type { AuthResponse } from './types.js';

export async function googleAuth(_req: Request, res: Response): Promise<void> {
  const url = authService.getGoogleAuthUrl();
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = req.query['code'] as string | undefined;

  if (!code) {
    res.redirect(`${config.FRONTEND_URL}/auth/error?message=missing_code`);
    return;
  }

  const result = await authService.handleGoogleCallback(code);

  // Redirect to frontend with tokens as query params
  const params = new URLSearchParams({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
  });

  res.redirect(`${config.FRONTEND_URL}/auth/callback?${params.toString()}`);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  const result = await authService.refreshAccessToken(refreshToken);

  const body: ApiResponse<AuthResponse> = {
    success: true,
    data: result,
  };
  res.json(body);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.user!.userId);

  const body: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Logged out successfully' },
  };
  res.json(body);
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getCurrentUser(req.user!.userId);

  const body: ApiResponse<typeof user> = {
    success: true,
    data: user,
  };
  res.json(body);
}
