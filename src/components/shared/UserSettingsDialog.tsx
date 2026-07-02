import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store";
import { userProfileService, type UserProfileDto } from "@/services/userProfile.service";
import { getInitials } from "@/utils/formatters";

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    userProfileService
      .getProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setName(data.name);
        setContactNumber(data.contactNumber ?? "");
        setCountry(data.country ?? "");
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await userProfileService.updateProfile({
        name: name.trim(),
        email: profile.email,
        contactNumber: contactNumber.trim(),
        country: country.trim(),
      });
      setProfile(updated);
      updateUser({ name: updated.name, initials: getInitials(updated.name) });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4" /> User Settings
          </DialogTitle>
        </DialogHeader>

        {loading || !profile ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1 border-b border-border pb-5">
              <Avatar className="size-16 border border-primary/40 bg-primary/20">
                <AvatarFallback className="bg-transparent text-lg font-semibold text-primary">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 text-base font-semibold">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{formatRole(profile.role)}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Full Name
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Phone Number
                </label>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+1 (212) 555-0194"
                  className="h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Country
                </label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. US"
                  className="h-10"
                />
              </div>

              <div className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</span>
                  <span className="font-medium">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Team</span>
                  <span className="font-medium">{profile.teamName ?? "Unassigned"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</span>
                  <span className="font-medium text-primary">{formatRole(profile.role)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !profile || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
