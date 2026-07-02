import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { cloudConnectionService } from "@/services/cloudConnection.service";
import { PROVIDER_LABEL } from "@/services/cloudSync.service";
import { useCloudSyncStore } from "@/store";
import { ROUTES } from "@/constants/routes";
import type { CloudProvider } from "@/types";

const PATH_TO_PROVIDER: Record<string, CloudProvider> = {
  google: "google-drive",
  onedrive: "onedrive",
};

export default function OAuthCallbackPage() {
  const { provider: pathProvider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const setConnected = useCloudSyncStore((s) => s.setConnected);
  const setError = useCloudSyncStore((s) => s.setError);
  const [state, setState] = useState<"pending" | "error">("pending");
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const provider = pathProvider ? PATH_TO_PROVIDER[pathProvider] : undefined;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthError = params.get("error");

    if (!provider) {
      setState("error");
      setMessage("Unknown provider in callback URL.");
      return;
    }

    if (oauthError || !code) {
      const msg = oauthError ?? "No authorization code returned.";
      setError(msg);
      setState("error");
      setMessage(msg);
      return;
    }

    cloudConnectionService
      .exchangeCode(provider, code)
      .then(() => {
        setConnected({ provider, email: "Connected" });
        navigate(ROUTES.projects, { replace: true });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to complete sign-in.";
        setError(msg);
        setState("error");
        setMessage(msg);
      });
  }, [pathProvider, navigate, setConnected, setError]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background text-foreground">
      {state === "pending" && <Loader2 className="size-6 animate-spin text-primary" />}
      {state === "error" && <XCircle className="size-6 text-danger" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      {state === "error" && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.dashboard, { replace: true })}
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to dashboard
        </button>
      )}
      {state === "pending" && pathProvider && PATH_TO_PROVIDER[pathProvider] && (
        <p className="text-xs text-muted-foreground">
          Connecting {PROVIDER_LABEL[PATH_TO_PROVIDER[pathProvider]]}…
        </p>
      )}
    </div>
  );
}
