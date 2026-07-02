import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--color-primary),transparent)]/18" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Zap className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">
              Axion <span className="font-semibold">VisualOps</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Intelligent Asset Management System
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-xl">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to access the workspace
          </p>

          <div className="mt-6">
            <LoginForm
              onSuccess={() => {
                toast.success("Signed in successfully");
                navigate(ROUTES.dashboard, { replace: true });
              }}
              onForgotPassword={() =>
                toast.info("Password reset isn't wired up yet — contact your workspace admin.")
              }
              onSso={(provider) => toast.info(`${provider} sign-in isn't wired up yet.`)}
            />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2026 Axion VisualOps · Enterprise Edition
        </p>
      </div>
    </div>
  );
}
