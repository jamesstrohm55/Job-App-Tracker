import type { Request, Response } from 'express';
import * as contactService from './service.js';
import type { ApiResponse } from '../../types/common.js';
import type { CreateContactInput, UpdateContactInput } from './schemas.js';

export async function list(req: Request, res: Response): Promise<void> {
  const contacts = await contactService.listContacts(req.user!.userId, req.params['id']!);

  const body: ApiResponse<typeof contacts> = {
    success: true,
    data: contacts,
  };
  res.json(body);
}

export async function get(req: Request, res: Response): Promise<void> {
  const contact = await contactService.getContact(
    req.user!.userId,
    req.params['id']!,
    req.params['contactId']!,
  );

  const body: ApiResponse<typeof contact> = {
    success: true,
    data: contact,
  };
  res.json(body);
}

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.body as CreateContactInput;
  const contact = await contactService.createContact(
    req.user!.userId,
    req.params['id']!,
    data,
  );

  const body: ApiResponse<typeof contact> = {
    success: true,
    data: contact,
  };
  res.status(201).json(body);
}

export async function update(req: Request, res: Response): Promise<void> {
  const data = req.body as UpdateContactInput;
  const contact = await contactService.updateContact(
    req.user!.userId,
    req.params['id']!,
    req.params['contactId']!,
    data,
  );

  const body: ApiResponse<typeof contact> = {
    success: true,
    data: contact,
  };
  res.json(body);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await contactService.deleteContact(
    req.user!.userId,
    req.params['id']!,
    req.params['contactId']!,
  );

  const body: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Contact deleted' },
  };
  res.json(body);
}
