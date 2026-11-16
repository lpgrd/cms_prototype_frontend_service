"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { firstAccessibleHref } from "@/components/layout/nav";
import { api } from "@/lib/api";
import type { Me, Permission } from "@/lib/types";

export const ME_KEY = ["auth", "me"];

export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: () => api.get<Me>("/auth/me"), staleTime: 5 * 60_000 });
}

/** True if the user holds the permission (superadmins hold all). The API enforces the same rule. */
export const hasPermission = (me: Pick<Me, "isSuperadmin" | "permissions"> | undefined, permission: Permission) =>
  !!me && (me.isSuperadmin || me.permissions.includes(permission));

/** `can("bills.cancel")` — for hiding actions the signed-in user is not allowed to take. */
export function useCan() {
  const { data: me } = useMe();
  return useCallback((permission: Permission) => hasPermission(me, permission), [me]);
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: me } = useMe();
  return useCallback(async () => {
    // Partners go back to their own sign-in page.
    const signIn = me?.accountType === "PARTNER" ? "/partner/login" : "/login";
    await api.post("/auth/logout").catch(() => undefined);
    qc.clear();
    router.replace(signIn);
  }, [qc, router, me?.accountType]);
}

/** Landing page after sign-in: the first section the user's role can open. */
export const homeFor = (me: Me) => firstAccessibleHref(me);

export const roleLabel = (me: Pick<Me, "accountType" | "role">) => (me.accountType === "PARTNER" ? "Partner" : (me.role?.name ?? "—"));
