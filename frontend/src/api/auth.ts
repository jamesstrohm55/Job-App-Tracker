import api from "@/api/client"
import type { AuthResponse, User } from "@/types"

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/google", { credential })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me")
  return data
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout")
}
