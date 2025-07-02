
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Boats from "./pages/Boats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/boats"
        element={
          <ProtectedRoute>
            <Boats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-3xl font-bold">Fournisseurs</h1>
              <p className="text-gray-600 mt-2">Module en cours de développement...</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-3xl font-bold">Commandes</h1>
              <p className="text-gray-600 mt-2">Module en cours de développement...</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-3xl font-bold">Gestion du Stock</h1>
              <p className="text-gray-600 mt-2">Module en cours de développement...</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-3xl font-bold">Maintenance</h1>
              <p className="text-gray-600 mt-2">Module en cours de développement...</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-3xl font-bold">Alertes</h1>
              <p className="text-gray-600 mt-2">Module en cours de développement...</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <div className="p-6">
              <h1 className="text-3xl font-bold">Paramètres</h1>
              <p className="text-gray-600 mt-2">Module en cours de développement...</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <AppRoutes />
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
