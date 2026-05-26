import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { isRecipesLocked } from "@/modules/recipes-lock/actions";
import { getActiveEvent, listActiveEvents } from "@/modules/events/queries";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

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
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={scope.role} businessName={business?.name ?? "Operations"} recipesLocked={recipesLocked} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          scope={scope}
          user={{ name: session.user.name ?? "User", email: session.user.email ?? "" }}
          events={events}
          activeEventId={activeEvent?.id ?? null}
        />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
