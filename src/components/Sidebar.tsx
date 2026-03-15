import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  // Main
  { path: '/', label: 'Dashboard', icon: '📊' },
  
  // IoT Monitoring
  { path: '/kennel', label: 'Kennel Monitor', icon: '🐕' },
  { path: '/sensors', label: 'Sensors', icon: '📡' },
  { path: '/cameras', label: 'Cameras', icon: '📹' },
  { path: '/alerts', label: 'Alerts', icon: '🔔' },
  
  // Devices
  { path: '/collars', label: 'GPS Collars', icon: '📍' },
  { path: '/feeders', label: 'Feeders', icon: '🍖' },
  { path: '/water', label: 'Water Dispensers', icon: '💧' },
  
  // Management
  { path: '/schedules', label: 'Schedules', icon: '⏰' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen p-4">
      <div className="mb-8 px-4 pt-4">
        <h1 className="text-xl font-bold text-white">🐾 Smart Pet</h1>
        <p className="text-slate-400 text-sm">Backoffice</p>
      </div>
      
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-xs">System Status</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-green-500 text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
