"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button, ErrorState, Modal } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { QrResponse } from "@/lib/types";

/** Shows a partner's QR with download (PNG/SVG) and copy-link actions. `endpoint` returns a QrResponse. */
export function QrShareModal({
  open,
  onClose,
  endpoint,
  title,
  fileName,
}: {
  open: boolean;
  onClose: () => void;
  endpoint: string;
  title: string;
  fileName: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["qr", endpoint],
    queryFn: () => api.get<QrResponse>(endpoint),
    enabled: open,
    staleTime: Infinity,
  });

  const download = (href: string, ext: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = `${fileName}.${ext}`;
    a.click();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {isLoading ? (
        <div role="status" className="space-y-4">
          <span className="sr-only">Creating the QR code…</span>
          <Skeleton className="mx-auto size-64 rounded-lg motion-reduce:animate-none" />
          <Skeleton className="mx-auto h-7 w-40 motion-reduce:animate-none" />
          <Skeleton className="mx-auto h-3 w-56 motion-reduce:animate-none" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} />
      ) : (
        <div className="space-y-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise */}
          <img src={data.pngDataUrl} alt={`QR code ${data.code}`} className="mx-auto size-64 rounded-lg border border-border" />
          <div>
            <div className="font-mono text-2xl font-semibold tracking-[0.2em]">{data.code}</div>
            <div className="mt-1 text-xs break-all text-muted-foreground">{data.url}</div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="size-4" />} onClick={() => download(data.pngDataUrl, "png")}>
              PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="size-4" />}
              onClick={() => download(URL.createObjectURL(new Blob([data.svg], { type: "image/svg+xml" })), "svg")}
            >
              SVG (print)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy className="size-4" />}
              onClick={() => navigator.clipboard.writeText(data.url).then(() => toast.success("Link copied"))}
            >
              Copy link
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
