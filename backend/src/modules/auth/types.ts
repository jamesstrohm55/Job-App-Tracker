export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
  tokens: AuthTokens;
}
