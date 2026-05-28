import { LocationSwitcher } from "./location-switcher";
import { EventSwitcher } from "./event-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

type Scope = {
  role: "OWNER" | "MANAGER";
  locationId: string;
  locationName: string;
  availableLocations: { id: string; name: string; kind: "STORE" | "EVENT" }[];
};

type Ev = { id: string; name: string; color: string | null; startDate: Date; endDate: Date };

export function Topbar({
  scope,
  user,
  events,
  activeEventId,
  businessName,
  recipesLocked,
}: {
  scope: Scope;
  user: { name: string; email: string };
  events: Ev[];
  activeEventId: string | null;
  businessName: string;
  recipesLocked: boolean;
}) {
  const active = scope.availableLocations.find((l) => l.id === scope.locationId)!;
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b glass px-4 sm:px-6">
      <MobileNav role={scope.role} businessName={businessName} recipesLocked={recipesLocked} />
      <LocationSwitcher active={active} options={scope.availableLocations} />
      <EventSwitcher events={events} activeEventId={activeEventId} />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} role={scope.role} />
      </div>
    </header>
  );
}
