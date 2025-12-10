import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SapereLayout from "./components/SapereLayout";
import { useAuth } from "./_core/hooks/useAuth";

// Pages
import FamilyDashboard from "./pages/FamilyDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import AgendaPage from "./pages/AgendaPage";
import DocumentosPage from "./pages/DocumentosPage";
import NotificacoesPage from "./pages/NotificacoesPage";
import PacientesPage from "./pages/PacientesPage";
import ProntuarioPage from "./pages/ProntuarioPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to appropriate dashboard based on role
  if (user?.role === "family") {
    return <FamilyDashboard />;
  } else if (user?.role === "therapist" || user?.role === "admin") {
    return <TherapistDashboard />;
  }

  return <FamilyDashboard />;
}

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any>, [key: string]: any }) {
  return (
    <SapereLayout>
      <Component {...props} />
    </SapereLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes without layout */}
      <Route path="/login" component={LoginPage} />
      <Route path="/change-password" component={ChangePasswordPage} />
      
      {/* Protected routes with layout */}
      <Route path="/">
        {() => <ProtectedRoute component={DashboardRouter} />}
      </Route>
      <Route path="/agenda">
        {() => <ProtectedRoute component={AgendaPage} />}
      </Route>
      <Route path="/documentos">
        {() => <ProtectedRoute component={DocumentosPage} />}
      </Route>
      <Route path="/notificacoes">
        {() => <ProtectedRoute component={NotificacoesPage} />}
      </Route>
      <Route path="/pacientes">
        {() => <ProtectedRoute component={PacientesPage} />}
      </Route>
      <Route path="/prontuarios/:id">
        {(params) => <ProtectedRoute component={ProntuarioPage} />}
      </Route>
      <Route path="/admin/usuarios">
        {() => <ProtectedRoute component={AdminUsersPage} />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
