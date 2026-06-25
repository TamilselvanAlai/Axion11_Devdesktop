import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/layout";
import { RequireAuth } from "@/middleware/requireAuth";
import { ROUTES } from "@/constants/routes";
import LoginPage from "@/app/login/LoginPage";
import DashboardPage from "@/app/dashboard/DashboardPage";
import AssetsPage from "@/app/assets/AssetsPage";
import SettingsPage from "@/app/settings/SettingsPage";

export default function App() {
  return (
    <RootLayout>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.login} element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={ROUTES.assets} element={<AssetsPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
          </Route>

          <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
        </Routes>
      </BrowserRouter>
    </RootLayout>
  );
}
