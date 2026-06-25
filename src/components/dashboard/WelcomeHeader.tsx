import { useUser } from "@/hooks/useUser";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeHeader() {
  const user = useUser();
  const firstName = user?.name.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {getGreeting()}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{today} · SS25 Campaign is active</p>
    </div>
  );
}
