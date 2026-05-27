"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CredentialsDialog } from "./credentials-dialog";
import { resetPasswordAction, deleteUserAction, updateUserRoleAction } from "@/modules/users/actions";
import { toast } from "@/components/ui/use-toast";

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: "OWNER" | "MANAGER";
  isSelf: boolean;
};

export function UserRowActions({ userId, userName, userEmail, currentRole, isSelf }: Props) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const reset = () => {
    if (!confirm(`Reset password for ${userName}? They'll need the new password to log in.`)) return;
    start(async () => {
      const res = await resetPasswordAction(userId);
      if ("error" in res) {
        toast({ title: "Reset failed", description: res.error, variant: "destructive" });
        return;
      }
      setCredentials({ email: res.email, password: res.password });
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm(`Delete ${userName} (${userEmail})? This can't be undone.`)) return;
    start(async () => {
      try {
        await deleteUserAction(userId);
        toast({ title: "User deleted" });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Delete failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  const changeRole = (next: "OWNER" | "MANAGER") => {
    if (next === currentRole) return;
    start(async () => {
      try {
        await updateUserRoleAction(userId, next);
        toast({ title: `Role changed to ${next.toLowerCase()}` });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending} className="h-7 px-2 text-xs">Manage</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={reset}>
            <KeyRound className="h-3.5 w-3.5" /> Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {currentRole === "MANAGER" && (
            <DropdownMenuItem onClick={() => changeRole("OWNER")}>
              <Shield className="h-3.5 w-3.5" /> Promote to Owner
            </DropdownMenuItem>
          )}
          {currentRole === "OWNER" && !isSelf && (
            <DropdownMenuItem onClick={() => changeRole("MANAGER")}>
              <Shield className="h-3.5 w-3.5" /> Demote to Manager
            </DropdownMenuItem>
          )}
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={remove} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete user
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {credentials && (
        <CredentialsDialog
          title="Password reset — share the new password"
          email={credentials.email}
          password={credentials.password}
          onClose={() => setCredentials(null)}
        />
      )}
    </>
  );
}
