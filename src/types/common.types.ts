export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: string | null;
}

export type ThemeMode = "light" | "dark" | "system";

export interface SelectOption<T = string> {
  label: string;
  value: T;
}
