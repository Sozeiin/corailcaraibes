
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import { Boats } from "./pages/Boats";
import { BoatDetails } from "./pages/BoatDetails";
import Suppliers from "./pages/Suppliers";
import Orders from "./pages/Orders";
import Stock from "./pages/Stock";
import Maintenance from "./pages/Maintenance";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Purchasing from "./pages/Purchasing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, session, user } = useAuth();
  
  // Show loading spinner while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-marine-50 to-slate-100">
        <div className="text-center p-8 rounded-xl bg-white shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-marine-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement en cours...</p>
        </div>
      </div>
    );
  }
  
  // Check for valid authentication (both session and user profile)
  if (!session || !user || !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={isAuthenticated ? <Navigate to="/" /> : <Auth />} 
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
        path="/boats/:boatId"
        element={
          <ProtectedRoute>
            <BoatDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <Suppliers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <Stock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <Maintenance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchasing"
        element={
          <ProtectedRoute>
            <Purchasing />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <Layout>
    <AppRoutes />
    <Sonner />
  </Layout>
);

export default App;
