import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useLogin } from "@/hooks/useLogin";
import { loginSchema, type LoginFormValues } from "@/utils/validators";
import { readJson } from "@/utils/storage";
import { STORAGE_KEYS } from "@/utils/constants";

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
  onSso?: (provider: "Google" | "Microsoft Live") => void;
}

export function LoginForm({ onSuccess, onForgotPassword, onSso }: LoginFormProps) {
  const { login, isSubmitting, error, clearError } = useLogin();
  const rememberedEmail = readJson<string>(STORAGE_KEYS.rememberedEmail);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail ?? "",
      password: "",
      rememberMe: Boolean(rememberedEmail),
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      onSuccess();
    } catch {
      // surfaced via `error` from useLogin
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full flex-col gap-5"
      aria-describedby={error ? "login-form-error" : undefined}
    >
      {error && (
        <div
          id="login-form-error"
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Username
        </label>
        <Input
          id="email"
          type="text"
          autoComplete="username"
          placeholder="Enter username"
          aria-invalid={Boolean(errors.email)}
          className="h-10"
          onFocus={clearError}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter password"
          aria-invalid={Boolean(errors.password)}
          className="h-10"
          onFocus={clearError}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Controller
            name="rememberMe"
            control={control}
            render={({ field }) => (
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          Remember me
        </label>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} className="h-10 w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <div className="relative flex items-center py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="px-3 text-xs text-muted-foreground">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSso?.("Google")}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <GoogleIcon className="size-4" />
          Google
        </button>
        <button
          type="button"
          onClick={() => onSso?.("Microsoft Live")}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <MicrosoftIcon className="size-4" />
          Microsoft Live
        </button>
      </div>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.59-5.17 3.59-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.1c.95-2.85 3.6-4.96 6.73-4.96Z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
