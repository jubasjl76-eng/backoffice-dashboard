import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LocaleProvider } from './i18n';
import { AuthProvider, RequireAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CareInbox } from './pages/CareInbox';
import { Animals } from './pages/Animals';
import { Pens } from './pages/Pens';
import { Litters } from './pages/Litters';
import { Buyers } from './pages/Buyers';
import { Meds } from './pages/Meds';
import { Rules } from './pages/Rules';
import { Devices } from './pages/Devices';
import { Ops } from './pages/Ops';
import { Website } from './pages/Website';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';
import { Vaccinations } from './pages/Vaccinations';
import { GoHomePack } from './pages/GoHomePack';
import { Calendar } from './pages/Calendar';
import { Templates } from './pages/Templates';
import { Privacy } from './pages/Privacy';

export default function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/inbox" element={<CareInbox />} />
              <Route path="/animals" element={<Animals />} />
              <Route path="/pens" element={<Pens />} />
              <Route path="/litters" element={<Litters />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/buyers" element={<Buyers />} />
              <Route path="/meds" element={<Meds />} />
              <Route path="/vaccinations" element={<Vaccinations />} />
              <Route path="/go-home/:pupId" element={<GoHomePack />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/ops" element={<Ops />} />
              <Route path="/website" element={<Website />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}
