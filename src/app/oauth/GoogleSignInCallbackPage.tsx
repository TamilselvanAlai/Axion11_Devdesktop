import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { googleAuthService } from "@/services/googleAuth.service";
import { useAuthStore } from "@/store";
import { ROUTES } from "@/constants/routes";

export default function GoogleSignInCallbackPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [state, setState] = useState<"pending" | "error">("pending");
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");

    if (oauthError || !code) {
      setState("error");
      setMessage(oauthError ?? "No authorization code returned.");
      return;
    }

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    googleAuthService
      .exchangeCode(code, redirectUri)
      .then((session) => {
        setSession(session);
        navigate(ROUTES.dashboard, { replace: true });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to complete sign-in.";
        setState("error");
        setMessage(msg);
      });
  }, [navigate, setSession]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background text-foreground">
      {state === "pending" && <Loader2 className="size-6 animate-spin text-primary" />}
      {state === "error" && <XCircle className="size-6 text-danger" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      {state === "error" && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.login, { replace: true })}
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </button>
      )}
    </div>
  );
}
