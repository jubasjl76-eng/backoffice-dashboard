import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import KennelMonitor from './pages/KennelMonitor';
import Sensors from './pages/Sensors';
import Cameras from './pages/Cameras';
import Alerts from './pages/Alerts';
import { Collars } from './pages/Collars';
import { Feeders } from './pages/Feeders';
import { Water } from './pages/Water';
import { Schedules } from './pages/Schedules';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kennel" element={<KennelMonitor />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/collars" element={<Collars />} />
            <Route path="/feeders" element={<Feeders />} />
            <Route path="/water" element={<Water />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
