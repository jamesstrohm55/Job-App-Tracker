import type { Request, Response } from 'express';
import * as applicationService from './service.js';
import type { ApiResponse, PaginatedResponse } from '../../types/common.js';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  ListApplicationsQuery,
  CreateTimelineEventInput,
} from './schemas.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListApplicationsQuery;
  const result = await applicationService.listApplications(req.user!.userId, query);

  const body: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    meta: result.meta,
  };
  res.json(body);
}

export async function get(req: Request, res: Response): Promise<void> {
  const application = await applicationService.getApplication(
    req.user!.userId,
    req.params['id']!,
  );

  const body: ApiResponse<typeof application> = {
    success: true,
    data: application,
  };
  res.json(body);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateApplicationInput;
  const application = await applicationService.createApplication(req.user!.userId, data);

  const body: ApiResponse<typeof application> = {
    success: true,
    data: application,
  };
  res.status(201).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = req.body as UpdateApplicationInput;
  const application = await applicationService.updateApplication(
    req.user!.userId,
    req.params['id']!,
    data,
  );

  const body: ApiResponse<typeof application> = {
    success: true,
    data: application,
  };
  res.json(body);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await applicationService.deleteApplication(req.user!.userId, req.params['id']!);

  const body: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Application deleted' },
  };
  res.json(body);
}

export async function getTimeline(req: Request, res: Response): Promise<void> {
  const events = await applicationService.getTimeline(
    req.user!.userId,
    req.params['id']!,
  );

  const body: ApiResponse<typeof events> = {
    success: true,
    data: events,
  };
  res.json(body);
}

export async function addTimelineEvent(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateTimelineEventInput;
  const event = await applicationService.addTimelineEvent(
    req.user!.userId,
    req.params['id']!,
    data,
  );

  const body: ApiResponse<typeof event> = {
    success: true,
    data: event,
  };
  res.status(201).json(body);
}
