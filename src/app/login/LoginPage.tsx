import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="size-5" />
            </span>
            <span className="text-lg font-semibold">
              Axion <span className="text-muted-foreground font-normal">VisualOps</span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>

          <div className="mt-8">
            <LoginForm
              onSuccess={() => {
                toast.success("Signed in successfully");
                navigate(ROUTES.dashboard, { replace: true });
              }}
              onForgotPassword={() =>
                toast.info("Password reset isn't wired up yet — contact your workspace admin.")
              }
            />
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Demo: any email + any password (use "wrong" as the password to see the error state).
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-16">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed text-sidebar-foreground">
              "Axion gives our creative team one place to track every asset, from first draft to
              final delivery."
            </p>
            <footer className="text-sm text-sidebar-foreground/60">
              Jordan K. — Creative Operations Lead
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
