"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { createEventAction, updateEventAction, deleteEventAction } from "@/modules/events/actions";
import { toast } from "@/components/ui/use-toast";

type Ev = {
  id: string; name: string; color: string | null;
  startDate: string; endDate: string; isActive: boolean;
};

const PALETTE = ["#f97316", "#16a34a", "#0ea5e9", "#a855f7", "#dc2626", "#facc15"];

export function EventsManager({ events }: { events: Ev[] }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-md border p-2 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }}
              />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{e.name}</div>
                <div className="text-2xs text-muted-foreground">{e.startDate} → {e.endDate}</div>
              </div>
            </div>
            {!e.isActive && <Badge variant="muted">Inactive</Badge>}
            <EditEventButton event={e} />
            <DeleteButton
              action={() => deleteEventAction(e.id)}
              itemLabel="event"
              itemName={e.name}
              confirmText={`This will remove "${e.name}". Sales and cash closes tagged with it will keep their data but lose the tag.`}
            />
          </div>
        ))}
        {events.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            <Calendar className="h-4 w-4 mx-auto mb-1 opacity-50" />
            No events yet. Create one to tag days and analyze performance.
          </div>
        )}
      </div>
      <NewEventButton />
    </div>
  );
}

function NewEventButton() {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [color, setColor] = React.useState(PALETTE[0]);
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setColor(PALETTE[0]); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full"><Plus className="h-3.5 w-3.5" /> Add event</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("color", color);
            start(async () => {
              try {
                await createEventAction(fd);
                toast({ title: "Event created" });
                setOpen(false);
                router.refresh();
              } catch (err: any) { toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" }); }
            });
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="ev-name">Event name</Label>
            <Input id="ev-name" name="name" required placeholder="e.g. Bollywood Night, Summer Fest" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-start">Start date</Label>
              <Input id="ev-start" name="startDate" type="date" required defaultValue={today} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-end">End date</Label>
              <Input id="ev-end" name="endDate" type="date" required defaultValue={today} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Color</Label>
            <div className="flex gap-1.5 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Pick ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-notes">Notes (optional)</Label>
            <Textarea id="ev-notes" name="notes" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEventButton({ event }: { event: Ev }) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const router = useRouter();
  const [color, setColor] = React.useState(event.color ?? PALETTE[0]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-2xs h-7 px-2">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit event</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("color", color);
            start(async () => {
              try {
                await updateEventAction(event.id, fd);
                toast({ title: "Event updated" });
                setOpen(false);
                router.refresh();
              } catch (err: any) { toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" }); }
            });
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor={`name-${event.id}`}>Name</Label>
            <Input id={`name-${event.id}`} name="name" required defaultValue={event.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start date</Label>
              <Input name="startDate" type="date" required defaultValue={event.startDate} />
            </div>
            <div className="grid gap-1.5">
              <Label>End date</Label>
              <Input name="endDate" type="date" required defaultValue={event.endDate} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Color</Label>
            <div className="flex gap-1.5 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" value="true" defaultChecked={event.isActive} />
            <span>Active</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
