import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from './auth.js';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Inbox from './pages/Inbox.jsx';
import LeadDetail from './pages/LeadDetail.jsx';
import Listings from './pages/Listings.jsx';
import ListingImport from './pages/ListingImport.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import AppShell from './components/AppShell.jsx';

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="listings" element={<Listings />} />
        <Route path="listings/import" element={<ListingImport />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
