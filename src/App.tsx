import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/layout";
import { RequireAuth } from "@/middleware/requireAuth";
import { ROUTES } from "@/constants/routes";
import LoginPage from "@/app/login/LoginPage";
import DashboardPage from "@/app/dashboard/DashboardPage";
import ProjectsPage from "@/app/projects/ProjectsPage";
import ProjectDetailPage from "@/app/projects/ProjectDetailPage";
import RecentPage from "@/app/recent/RecentPage";
import TransfersPage from "@/app/transfers/TransfersPage";
import SettingsPage from "@/app/settings/SettingsPage";

export default function App() {
  return (
    <RootLayout>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.login} element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route path={ROUTES.projects} element={<ProjectsPage />} />
            <Route path={`${ROUTES.projects}/:projectId`} element={<ProjectDetailPage />} />
            <Route path={ROUTES.recent} element={<RecentPage />} />
            <Route path={ROUTES.transfers} element={<TransfersPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
          </Route>

          <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
        </Routes>
      </BrowserRouter>
    </RootLayout>
  );
}
