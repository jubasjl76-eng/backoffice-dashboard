import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/feeders" element={<div className="p-8 text-white">Feeders Page - Coming Soon</div>} />
            <Route path="/water" element={<div className="p-8 text-white">Water Dispensers Page - Coming Soon</div>} />
            <Route path="/schedules" element={<div className="p-8 text-white">Schedules Page - Coming Soon</div>} />
            <Route path="/analytics" element={<div className="p-8 text-white">Analytics Page - Coming Soon</div>} />
            <Route path="/settings" element={<div className="p-8 text-white">Settings Page - Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
