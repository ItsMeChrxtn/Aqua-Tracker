import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { ROLE_HOME } from './utils/navConfig';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ChangePasswordRequired from './pages/auth/ChangePasswordRequired';
import NotFound from './pages/NotFound';

import OwnerDashboard from './pages/owner/OwnerDashboard';
import FishpondList from './pages/owner/FishpondList';
import RegisterFishpond from './pages/owner/RegisterFishpond';
import FishpondDetail from './pages/owner/FishpondDetail';
import StockingRecords from './pages/owner/StockingRecords';
import FeedingRecords from './pages/owner/FeedingRecords';
import MortalityRecords from './pages/owner/MortalityRecords';
import GrowthMonitoring from './pages/owner/GrowthMonitoring';
import SurvivalMonitoring from './pages/owner/SurvivalMonitoring';
import HarvestEstimation from './pages/owner/HarvestEstimation';
import SalesRecords from './pages/owner/SalesRecords';
import InventoryManagement from './pages/owner/InventoryManagement';
import OwnerReports from './pages/owner/Reports';
import ProfileSettings from './pages/owner/ProfileSettings';

import AgriDashboard from './pages/agri/AgriDashboard';
import FishpondsApproval from './pages/agri/FishpondsApproval';
import FishpondOwners from './pages/agri/FishpondOwners';
import RegisteredList from './pages/agri/RegisteredList';
import ProductionOverview from './pages/agri/ProductionOverview';
import MortalityOverview from './pages/agri/MortalityOverview';
import GrowthOverview from './pages/agri/GrowthOverview';
import HarvestOverview from './pages/agri/HarvestOverview';
import AgriReports from './pages/agri/AgriReports';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SpeciesManagement from './pages/admin/SpeciesManagement';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import ActivityLogs from './pages/admin/ActivityLogs';
import DataExport from './pages/admin/DataExport';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ChangePasswordRequired />} />
          </Route>
          <Route path="/" element={<Home />} />

          <Route element={<ProtectedRoute roles={['fishpond_owner']} />}>
            <Route path="/owner" element={<DashboardLayout />}>
              <Route path="dashboard" element={<OwnerDashboard />} />
              <Route path="fishponds" element={<FishpondList />} />
              <Route path="fishponds/new" element={<RegisterFishpond />} />
              <Route path="fishponds/:id" element={<FishpondDetail />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="monitoring/stocking" element={<StockingRecords />} />
              <Route path="monitoring/feeding" element={<FeedingRecords />} />
              <Route path="monitoring/mortality" element={<MortalityRecords />} />
              <Route path="monitoring/growth" element={<GrowthMonitoring />} />
              <Route path="monitoring/survival" element={<SurvivalMonitoring />} />
              <Route path="monitoring/sales" element={<SalesRecords />} />
              <Route path="harvest-estimation" element={<HarvestEstimation />} />
              <Route path="reports" element={<OwnerReports />} />
              <Route path="settings/profile" element={<ProfileSettings />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['agriculture_staff']} />}>
            <Route path="/agri" element={<DashboardLayout />}>
              <Route path="dashboard" element={<AgriDashboard />} />
              <Route path="fishponds" element={<FishpondsApproval />} />
              <Route path="owners" element={<FishpondOwners />} />
              <Route path="registered-list" element={<RegisteredList />} />
              <Route path="monitoring/production" element={<ProductionOverview />} />
              <Route path="monitoring/mortality" element={<MortalityOverview />} />
              <Route path="monitoring/growth" element={<GrowthOverview />} />
              <Route path="monitoring/harvest" element={<HarvestOverview />} />
              <Route path="reports" element={<AgriReports />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="species" element={<SpeciesManagement />} />
              <Route path="settings" element={<SystemSettingsPage />} />
              <Route path="activity-logs" element={<ActivityLogs />} />
              <Route path="backup" element={<DataExport />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
