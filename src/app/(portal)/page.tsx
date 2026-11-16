"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { homeFor, useMe } from "@/providers/auth";

export default function Home() {
  const { data: me } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me) router.replace(homeFor(me));
  }, [me, router]);
  return <Spinner />;
}
