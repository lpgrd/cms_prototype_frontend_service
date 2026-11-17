"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Alert, Modal } from "@/components/ui";

/** Camera QR scanner for tablets/phones at the counter. USB scanners can simply type into the code field instead. */
export function QrScannerModal({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (text: string) => void }) {
  const regionId = `qr-${useId().replace(/:/g, "")}`;
  const [error, setError] = useState<string | null>(null);
  // Opening the camera takes a moment (and a permission prompt the first time).
  const [starting, setStarting] = useState(true);
  const handleScan = useEffectEvent((text: string) => onScan(text));
  const close = () => {
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(regionId, { verbose: false });
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => handleScan(text),
          () => undefined,
        );
        if (!cancelled) setStarting(false);
      } catch {
        setStarting(false);
        setError("Could not access the camera. Allow camera permission, or type the code instead.");
      }
    })();

    return () => {
      cancelled = true;
      // Closed (by a scan or by the user): the next opening starts the camera again.
      setStarting(true);
      if (scanner?.isScanning) scanner.stop().catch(() => undefined);
    };
  }, [open, regionId]);

  return (
    <Modal open={open} onClose={close} title="Scan partner QR">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="relative min-h-64 overflow-hidden rounded-lg bg-muted">
        <div id={regionId} />
        {starting && !error && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="relative grid size-12 place-items-center rounded-full bg-background">
              <Camera className="size-5" aria-hidden />
              <Loader2
                className="absolute inset-0 size-12 animate-spin text-primary motion-reduce:animate-none"
                strokeWidth={1.25}
                aria-hidden
              />
            </span>
            Starting the camera…
            <span className="text-xs">Allow camera access if your browser asks.</span>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Point the camera at the partner&apos;s QR code.</p>
    </Modal>
  );
}
