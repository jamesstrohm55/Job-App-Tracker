import type { Application, ApplicationEvent, ApplicationStatus } from '@prisma/client';

export type ApplicationWithTimeline = Application & {
  timeline: ApplicationEvent[];
  _count: { contacts: number };
};

export type ApplicationListItem = Application & {
  _count: { contacts: number; timeline: number };
};

export interface StatusChangeEvent {
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
}
