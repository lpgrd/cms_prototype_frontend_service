"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { Alert, Modal } from "@/components/ui";

/** Camera QR scanner for tablets/phones at the counter. USB scanners can simply type into the code field instead. */
export function QrScannerModal({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (text: string) => void }) {
  const regionId = `qr-${useId().replace(/:/g, "")}`;
  const [error, setError] = useState<string | null>(null);
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
      } catch {
        setError("Could not access the camera. Allow camera permission, or type the code instead.");
      }
    })();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().catch(() => undefined);
    };
  }, [open, regionId]);

  return (
    <Modal open={open} onClose={close} title="Scan partner QR">
      {error && <Alert tone="danger">{error}</Alert>}
      <div id={regionId} className="overflow-hidden rounded-lg bg-muted" />
      <p className="mt-3 text-xs text-muted-foreground">Point the camera at the customer&apos;s QR code.</p>
    </Modal>
  );
}
