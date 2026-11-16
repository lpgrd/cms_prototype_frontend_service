import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** What this deployment can do without extra providers (SMS gateway, mail server). */
export interface AuthOptions {
  passwordResetByEmail: boolean;
  smsOtp: boolean;
}

export function useAuthOptions() {
  return useQuery({ queryKey: ["auth-options"], queryFn: () => api.get<AuthOptions>("/auth/options"), staleTime: 5 * 60_000 });
}
