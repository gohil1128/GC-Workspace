import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { isRecipesLocked } from "@/modules/recipes-lock/actions";
import { getActiveEvent, listActiveEvents } from "@/modules/events/queries";
import { BrandBar } from "@/components/shell/brand-bar";
import { LocationSwitcher } from "@/components/shell/location-switcher";
import { EventSwitcher } from "@/components/shell/event-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { PageTransition } from "@/components/shell/page-transition";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { SideNav } from "@/components/shell/side-nav";

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
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-espresso focus:px-4 focus:py-2 focus:text-sm focus:text-espresso-foreground"
      >
        Skip to main content
      </a>
      {/* Web: 216px sidebar. Below lg it collapses and MobileTabBar takes over. */}
      <SideNav
        role={scope.role}
        recipesLocked={recipesLocked}
        events={events}
        userName={session.user.name ?? "User"}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Content top strip: scope on the left, switchers on the right. */}
        <header className="sticky top-0 z-40 border-b border-border/70 glass pt-safe">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
            {/* The logo lives in the sidebar on web, so show it here only on mobile. */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <BrandBar businessName={business?.name ?? "Operations"} />
              </div>
              <span className="hidden truncate text-[13px] text-muted-foreground lg:inline">
                {business?.name ?? "Operations"} · {activeLocation.name}
                {activeEvent ? ` · ${activeEvent.name}` : " · All events"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <LocationSwitcher active={activeLocation} options={scope.availableLocations} />
              <EventSwitcher events={events} activeEventId={activeEvent?.id ?? null} />
              <ThemeToggle />
              <UserMenu name={session.user.name ?? "User"} email={session.user.email ?? ""} role={scope.role} />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 pb-tabbar outline-none lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileTabBar role={scope.role} />
    </div>
  );
}
