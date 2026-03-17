import type { Request, Response } from 'express';
import * as analyticsService from './service.js';
import type { ApiResponse } from '../../types/common.js';
import type { TimelineQuery, TimeInStageQuery } from './schemas.js';

export async function summary(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getSummary(req.user!.userId);

  const body: ApiResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(body);
}

export async function timeline(req: Request, res: Response): Promise<void> {
  const { days } = req.query as unknown as TimelineQuery;
  const data = await analyticsService.getTimeline(req.user!.userId, days);

  const body: ApiResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(body);
}

export async function funnel(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getFunnel(req.user!.userId);

  const body: ApiResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(body);
}

export async function timeInStage(req: Request, res: Response): Promise<void> {
  const { status } = req.query as unknown as TimeInStageQuery;
  const data = await analyticsService.getTimeInStage(req.user!.userId, status);

  const body: ApiResponse<typeof data> = {
    success: true,
    data,
  };
  res.json(body);
}
