import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { isRecipesLocked } from "@/modules/recipes-lock/actions";
import { getActiveEvent, listActiveEvents } from "@/modules/events/queries";
import { BrandBar } from "@/components/shell/brand-bar";
import { TopNav } from "@/components/shell/top-nav";
import { LocationSwitcher } from "@/components/shell/location-switcher";
import { EventSwitcher } from "@/components/shell/event-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { PageTransition } from "@/components/shell/page-transition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const scope = await getScope();
  const [business, recipesLocked, events, activeEvent] = await Promise.all([
    prisma.business.findUnique({ where: { id: scope.businessId }, select: { name: true } }),
    isRecipesLocked(scope.businessId),
    listActiveEvents(scope.businessId),
    getActiveEvent(scope.businessId),
  ]);
  const activeLocation = scope.availableLocations.find((l) => l.id === scope.locationId)!;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Row 1 — brand bar with utility cluster */}
      <header className="sticky top-0 z-40 border-b glass">
        <BrandBar businessName={business?.name ?? "Operations"}>
          <LocationSwitcher active={activeLocation} options={scope.availableLocations} />
          <EventSwitcher events={events} activeEventId={activeEvent?.id ?? null} />
          <ThemeToggle />
          <UserMenu name={session.user.name ?? "User"} email={session.user.email ?? ""} role={scope.role} />
        </BrandBar>
        {/* Row 2 — horizontal section nav with dropdown subsections */}
        <div className="border-t bg-card/40">
          <TopNav role={scope.role} recipesLocked={recipesLocked} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-fluid">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
