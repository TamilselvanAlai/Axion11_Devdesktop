import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { googleAuthService } from "@/services/googleAuth.service";
import { useAuthStore } from "@/store";
import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  async function handleSso(provider: "Google" | "Microsoft Live") {
    if (provider !== "Google") {
      toast.info(`${provider} sign-in isn't wired up yet.`);
      return;
    }

    try {
      if (googleAuthService.isTauri()) {
        const session = await googleAuthService.signInNative();
        setSession(session);
        toast.success("Signed in successfully");
        navigate(ROUTES.dashboard, { replace: true });
        return;
      }

      const { authUrl, configured, error } = await googleAuthService.getBrowserAuthUrl();
      if (!configured || !authUrl) {
        toast.error(error ?? "Google sign-in isn't configured on the server yet.");
        return;
      }
      window.location.href = authUrl;
    } catch (err) {
      // Tauri's invoke() rejects with the raw Rust error string (not an Error instance),
      // so surface that directly instead of masking it behind a generic message.
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Google sign-in failed.";
      toast.error(message);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-y-auto px-4 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--color-primary),transparent)]/18" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="mb-3 flex flex-col items-center gap-1.5 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Zap className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">
              Axion <span className="font-semibold">VisualOps</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Intelligent Asset Management System
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-xl">
          <h2 className="text-base font-semibold">Sign in</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enter your credentials to access the workspace
          </p>

          <div className="mt-4">
            <LoginForm
              onSuccess={() => {
                toast.success("Signed in successfully");
                navigate(ROUTES.dashboard, { replace: true });
              }}
              onForgotPassword={() =>
                toast.info("Password reset isn't wired up yet — contact your workspace admin.")
              }
              onSso={handleSso}
            />
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          © 2026 Axion VisualOps · Enterprise Edition
        </p>
      </div>
    </div>
  );
}
