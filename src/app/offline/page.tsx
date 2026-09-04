import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

// Precached by the service worker as the offline fallback. Deliberately
// contains no user data — it is served to anyone, signed in or not.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="bento w-full max-w-md p-10 text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-accent">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
        </span>
        <h1 className="text-lg font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page needs a connection. Reconnect and it will load normally.
        </p>
      </div>
    </div>
  );
}
