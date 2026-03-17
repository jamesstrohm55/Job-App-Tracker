import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { createOAuth2Client } from '../../lib/google.js';
import { config } from '../../config/index.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, parseDuration } from '../../utils/tokens.js';
import { ApiError } from '../../utils/ApiError.js';
import type { AuthResponse, GoogleUserInfo } from './types.js';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getGoogleAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleGoogleCallback(code: string): Promise<AuthResponse> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const response = await client.request<GoogleUserInfo>({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
  });
  const googleUser = response.data;

  const user = await prisma.user.upsert({
    where: { googleId: googleUser.id },
    update: {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    },
    create: {
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    },
  });

  const authTokens = await createTokenPair(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    tokens: authTokens,
  };
}

export async function refreshAccessToken(oldRefreshToken: string): Promise<AuthResponse> {
  let payload: { userId: string; tokenId: string };

  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt) {
    // Possible token reuse attack — revoke entire family
    if (storedToken) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
    }
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  if (storedToken.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token has expired');
  }

  // Rotate: revoke old, create new
  const newTokenPair = await createTokenPair(storedToken.userId, storedToken.user.email);

  // Find the new token record to link replacedBy
  const newTokenRecord = await prisma.refreshToken.findFirst({
    where: { userId: storedToken.userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date(), replacedBy: newTokenRecord?.id },
  });

  return {
    user: {
      id: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
      picture: storedToken.user.picture,
    },
    tokens: newTokenPair,
  };
}

export async function logout(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, picture: true, createdAt: true },
  });

  if (!user) throw ApiError.notFound('User');

  return user;
}

async function createTokenPair(userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });

  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseDuration(config.REFRESH_TOKEN_EXPIRY));

  const refreshTokenJwt = signRefreshToken({ userId, tokenId });

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token: refreshTokenJwt,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: refreshTokenJwt };
}
