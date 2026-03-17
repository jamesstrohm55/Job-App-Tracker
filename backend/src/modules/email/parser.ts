/**
 * Email parser: extracts job application signals from Gmail messages.
 *
 * TODO: Implement email parsing logic
 * - Parse subject lines for application confirmation patterns
 * - Extract company names, positions, and status indicators
 * - Match emails to existing applications by company/position
 * - Create timeline events for matched applications
 */

export interface ParsedEmail {
  subject: string;
  from: string;
  date: Date;
  company?: string;
  signal?: 'applied' | 'rejection' | 'interview' | 'offer';
}

export function parseJobEmail(_rawMessage: unknown): ParsedEmail | null {
  // TODO: Implement email parsing with pattern matching
  return null;
}
