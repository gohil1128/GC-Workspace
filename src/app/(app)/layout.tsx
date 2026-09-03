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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Single-row header (design 1a): logo left, pill nav centre, utilities right. */}
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandBar businessName={business?.name ?? "Operations"} />
          {/* Nav takes the middle; it scrolls horizontally before it wraps. */}
          <div className="min-w-0 flex-1 flex justify-center">
            <TopNav role={scope.role} recipesLocked={recipesLocked} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LocationSwitcher active={activeLocation} options={scope.availableLocations} />
            <EventSwitcher events={events} activeEventId={activeEvent?.id ?? null} />
            <ThemeToggle />
            <UserMenu name={session.user.name ?? "User"} email={session.user.email ?? ""} role={scope.role} />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-fluid">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
