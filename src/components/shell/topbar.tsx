import { LocationSwitcher } from "./location-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

type Scope = {
  role: "OWNER" | "MANAGER";
  locationId: string;
  locationName: string;
  availableLocations: { id: string; name: string; kind: "STORE" | "EVENT" }[];
};

export function Topbar({ scope, user }: { scope: Scope; user: { name: string; email: string } }) {
  const active = scope.availableLocations.find((l) => l.id === scope.locationId)!;
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur px-4">
      <MobileNav role={scope.role} />
      <LocationSwitcher active={active} options={scope.availableLocations} />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} role={scope.role} />
      </div>
    </header>
  );
}
