import { google } from 'googleapis';
import { prisma } from '../../lib/prisma.js';
import { createGmailOAuth2Client } from '../../lib/google.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { ApiError } from '../../utils/ApiError.js';

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export function getConnectUrl(): string {
  const client = createGmailOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
  });
}

export async function handleCallback(userId: string, code: string) {
  const client = createGmailOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw ApiError.badRequest('Failed to obtain Gmail tokens');
  }

  client.setCredentials(tokens);

  // Get email address associated with this Gmail account
  const gmail = google.gmail({ version: 'v1', auth: client });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const email = profile.data.emailAddress;

  if (!email) {
    throw ApiError.badRequest('Could not retrieve Gmail email address');
  }

  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = encrypt(tokens.refresh_token);

  await prisma.gmailIntegration.upsert({
    where: { userId },
    update: {
      email,
      accessToken: encryptedAccess.ciphertext,
      accessTokenIv: encryptedAccess.iv,
      accessTokenTag: encryptedAccess.tag,
      refreshToken: encryptedRefresh.ciphertext,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenTag: encryptedRefresh.tag,
      tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    },
    create: {
      userId,
      email,
      accessToken: encryptedAccess.ciphertext,
      accessTokenIv: encryptedAccess.iv,
      accessTokenTag: encryptedAccess.tag,
      refreshToken: encryptedRefresh.ciphertext,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenTag: encryptedRefresh.tag,
      tokenExpiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    },
  });

  return { email };
}

export async function getStatus(userId: string) {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { userId },
    select: { email: true, lastSyncAt: true, createdAt: true },
  });

  return {
    connected: !!integration,
    email: integration?.email ?? null,
    lastSyncAt: integration?.lastSyncAt ?? null,
  };
}

export async function syncEmails(userId: string) {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw ApiError.badRequest('Gmail not connected');
  }

  const _accessToken = decrypt({
    ciphertext: integration.accessToken,
    iv: integration.accessTokenIv,
    tag: integration.accessTokenTag,
  });

  // TODO: Implement email sync
  // 1. Create OAuth2 client with decrypted tokens
  // 2. Fetch messages since last historyId or last sync
  // 3. Parse emails using parser.ts
  // 4. Match to applications and create timeline events
  // 5. Update lastSyncAt and historyId

  await prisma.gmailIntegration.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  return { synced: 0, matched: 0 };
}

export async function disconnect(userId: string): Promise<void> {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw ApiError.badRequest('Gmail not connected');
  }

  await prisma.gmailIntegration.delete({ where: { userId } });
}
