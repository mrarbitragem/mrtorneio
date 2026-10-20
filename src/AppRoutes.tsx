import { Routes, Route, Navigate } from "react-router-dom";
import { LetzmrShell } from "./letzmr/ui/LetzmrShell";
import { LetzmrHomePage } from "./letzmr/ui/LetzmrHomePage";
import { LetzmrTournamentPage } from "./letzmr/ui/LetzmrTournamentPage";
import { LetzmrCategoryPage } from "./letzmr/ui/LetzmrCategoryPage";
import { LetzmrPublicPage } from "./letzmr/ui/LetzmrPublicPage";
import LoginPage from "./pages/LoginPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LetzmrShell />}>
        <Route index element={<LetzmrHomePage />} />
        <Route path="t/:tournamentId" element={<LetzmrTournamentPage />} />
        <Route path="t/:tournamentId/c/:categoryId" element={<LetzmrCategoryPage />} />
        <Route path="public/:tournamentId/:categoryId" element={<LetzmrPublicPage />} />
      </Route>
      {/* Compat com rotas do MVP embutido no Academy */}
      <Route path="/letzmr/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
