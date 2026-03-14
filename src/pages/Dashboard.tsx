import React from 'react';
import { StatCard } from '../components/StatCard';

export const Dashboard: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard Overview</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Feeders" value="12" change="+2 this week" icon="🐶" trend="up" />
        <StatCard title="Water Dispensers" value="8" change="+1 this week" icon="💧" trend="up" />
        <StatCard title="Feeding Events" value="1,247" change="+156 today" icon="🍖" trend="up" />
        <StatCard title="Water Events" value="892" change="+89 today" icon="💦" trend="up" />
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg transition-colors">
              + Add Feeder
            </button>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg transition-colors">
              + Add Water Dispenser
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors">
              Create Schedule
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors">
              View Reports
            </button>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">2 min ago</span>
              <span className="text-white">Feeder #5 dispensed food</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">15 min ago</span>
              <span className="text-white">Water level low - Feeder #3</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">1 hour ago</span>
              <span className="text-white">Schedule created for Feeder #7</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">2 hours ago</span>
              <span className="text-white">New device connected: Water #2</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* System Health */}
      <div className="mt-6 bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <span className="text-slate-300">API Server</span>
            <span className="flex items-center gap-2 text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Online
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <span className="text-slate-300">Database</span>
            <span className="flex items-center gap-2 text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Online
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <span className="text-slate-300">Active Devices</span>
            <span className="text-white font-semibold">20/20</span>
          </div>
        </div>
      </div>
    </div>
  );
};
