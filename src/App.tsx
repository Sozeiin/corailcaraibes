
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GlobalRealtimeProvider } from "@/components/GlobalRealtimeProvider";
import { PermissionGate } from "@/components/auth/PermissionGate";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import { Boats } from "./pages/Boats";
import { BoatsDashboard } from "./pages/BoatsDashboard";
import { BoatDetails } from "./pages/BoatDetails";
import { BoatSafetyControls } from "./pages/BoatSafetyControls";
import { SafetyControls } from "./pages/SafetyControls";

import Suppliers from "./pages/Suppliers";
import Orders from "./pages/Orders";
import SupplyRequests from "./pages/SupplyRequests";
import BoatPreparation from "./pages/BoatPreparation";
import Stock from "./pages/Stock";
import StockScanner from "./pages/StockScanner";
import ShipmentPreparations from "./pages/ShipmentPreparations";
import Maintenance from "./pages/Maintenance";
import MaintenancePreventive from "./pages/MaintenancePreventive";
import MaintenanceGantt from "./pages/MaintenanceGantt";
import MaintenanceHistory from "./pages/MaintenanceHistory";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";

import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Array<'direction' | 'chef_base' | 'technicien' | 'administratif'> }) {
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/maintenance" replace />;
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
            <PermissionGate page="dashboard">
              <Dashboard />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boats/dashboard"
        element={
          <ProtectedRoute>
            <PermissionGate page="boats">
              <BoatsDashboard />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boats"
        element={
          <ProtectedRoute>
            <PermissionGate page="boats">
              <Boats />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boats/:boatId"
        element={
          <ProtectedRoute>
            <PermissionGate page="boats">
              <BoatDetails />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/safety-controls"
        element={
          <ProtectedRoute>
            <PermissionGate page="safety_controls">
              <SafetyControls />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boats/:boatId/safety-controls"
        element={
          <ProtectedRoute>
            <PermissionGate page="safety_controls">
              <BoatSafetyControls />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <PermissionGate page="suppliers">
              <Suppliers />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <PermissionGate page="orders">
              <Orders />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/supply-requests"
        element={
          <ProtectedRoute>
            <PermissionGate page="supply_requests">
              <SupplyRequests />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route path="/boat-preparation" element={
        <ProtectedRoute>
          <PermissionGate page="boat_preparation">
            <BoatPreparation />
          </PermissionGate>
        </ProtectedRoute>
      } />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <PermissionGate page="stock">
              <Stock />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/preparations-expeditions"
        element={
          <ProtectedRoute>
            <PermissionGate page="stock">
              <ShipmentPreparations />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock/scanner"
        element={
          <ProtectedRoute>
            <PermissionGate page="stock_scanner">
              <StockScanner />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <PermissionGate page="maintenance">
              <Maintenance />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/preventive"
        element={
          <ProtectedRoute allowedRoles={['direction', 'chef_base', 'administratif']}>
            <PermissionGate page="maintenance_preventive">
              <MaintenancePreventive />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/gantt"
        element={
          <ProtectedRoute>
            <PermissionGate page="maintenance_gantt">
              <MaintenanceGantt />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance/history"
        element={
          <ProtectedRoute>
            <PermissionGate page="maintenance_history">
              <MaintenanceHistory />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <PermissionGate page="notifications">
              <Notifications />
            </PermissionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkin"
        element={
          <ProtectedRoute allowedRoles={['direction', 'chef_base', 'administratif']}>
            <CheckIn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={['direction', 'chef_base', 'administratif']}>
            <CheckOut />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['direction', 'chef_base', 'technicien', 'administratif']}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rapports"
        element={
          <ProtectedRoute allowedRoles={['direction', 'chef_base']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GlobalRealtimeProvider>
        <Layout>
          <AppRoutes />
          <Sonner />
        </Layout>
      </GlobalRealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
