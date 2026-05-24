import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const scope = await getScope();
  const business = await prisma.business.findUnique({ where: { id: scope.businessId }, select: { name: true } });
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={scope.role} businessName={business?.name ?? "Operations"} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar scope={scope} user={{ name: session.user.name ?? "User", email: session.user.email ?? "" }} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
