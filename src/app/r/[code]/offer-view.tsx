"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock3, MapPin, Phone, Ticket } from "lucide-react";
import { HallmarkStamp } from "@/components/hallmark-stamp";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import type { PublicOffer } from "@/lib/types";

/** Public page a customer lands on after scanning a partner's QR. */
export function OfferView() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-offer", code],
    queryFn: () => api.get<PublicOffer>(`/public/offers/${encodeURIComponent(code)}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div role="status" className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 py-10">
        <span className="sr-only">Loading the offer…</span>
        <Skeleton className="size-28 rounded-full motion-reduce:animate-none" />
        <Skeleton className="mt-10 h-4 w-56 motion-reduce:animate-none" />
        <Skeleton className="mt-4 h-10 w-72 motion-reduce:animate-none" />
        <Skeleton className="mt-3 h-10 w-48 motion-reduce:animate-none" />
        <Skeleton className="mt-4 h-4 w-32 motion-reduce:animate-none" />
        <Skeleton className="mt-10 h-32 w-full rounded-xl motion-reduce:animate-none" />
      </div>
    );
  }

  const store = data?.store.name ?? "Our store";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <HallmarkStamp text={`${store.toUpperCase()}   ${store.toUpperCase()}   `} className="mx-auto size-28 text-primary" />

      {error || !data ? (
        <div className="mt-12 text-center">
          <h1 className="font-heading text-4xl font-semibold">Offer not found</h1>
          <p className="mt-3 text-muted-foreground">This code isn&apos;t valid. Check the link or QR you scanned, or ask at the store.</p>
        </div>
      ) : (
        <>
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              {data.influencerName}
              {data.instagramHandle && <span> (@{data.instagramHandle})</span>} invites you to {store}
            </p>
            <h1 className="mt-3 text-balance font-heading text-4xl font-semibold leading-tight text-primary sm:text-5xl">{data.offer}</h1>
            <p className="mt-3 font-medium">{data.campaignName}</p>
            {data.description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{data.description}</p>}
          </div>

          {/* The code as a coupon: dashed edge with punched notches, the jeweller's counter slip. */}
          <div className="relative mt-10 rounded-2xl border-2 border-dashed border-primary/40 bg-card px-6 py-7 text-center text-card-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:delay-300 motion-safe:duration-500 motion-safe:fill-mode-both">
            {/* Punched notches: page-coloured circles that cut into the coupon's edge. */}
            <span aria-hidden className="absolute top-1/2 -left-[13px] size-6 -translate-y-1/2 rounded-full bg-background" />
            <span aria-hidden className="absolute top-1/2 -right-[13px] size-6 -translate-y-1/2 rounded-full bg-background" />
            {data.valid ? (
              <>
                <Ticket className="mx-auto size-5 text-primary" aria-hidden />
                <p className="mt-2 text-sm text-muted-foreground">Show this code at the counter</p>
                <p className="mt-3 font-mono text-4xl font-semibold tracking-[0.25em]">{data.code}</p>
                {data.endsAt && <p className="mt-3 text-xs text-muted-foreground">Valid until {date(data.endsAt)}</p>}
              </>
            ) : (
              <>
                <p className="flex items-center justify-center gap-2 font-medium">
                  <Clock3 className="size-4" aria-hidden /> This offer isn&apos;t running right now
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.startsAt && new Date(data.startsAt) > new Date() ? `It starts on ${date(data.startsAt)}.` : "Ask at the store for current offers."}
                </p>
              </>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">One use per mobile number for this campaign. The store verifies it with an OTP.</p>

          {(data.store.address || data.store.phone) && (
            <div className="mt-10 space-y-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{store}</p>
              {data.store.address && (
                <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> <span className="whitespace-pre-line">{data.store.address}</span></p>
              )}
              {data.store.phone && (
                <p className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden /> <a href={`tel:${data.store.phone}`} className="underline-offset-4 hover:underline">{data.store.phone}</a></p>
              )}
            </div>
          )}
          {data.terms && <p className="mt-auto whitespace-pre-line pt-10 text-xs leading-relaxed text-muted-foreground">{data.terms}</p>}
        </>
      )}
    </div>
  );
}
