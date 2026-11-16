import { Suspense } from "react";
import { OfferView } from "./offer-view";

export default function OfferPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">Loading offer…</div>}>
        <OfferView />
      </Suspense>
    </div>
  );
}
