import { prisma } from "@/lib/prisma";

export async function writeAudit(opts: {
  businessId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      businessId: opts.businessId,
      userId: opts.userId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      diffJson: (opts.diff as object) ?? undefined,
    },
  });
}
