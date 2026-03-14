import React from 'react';

export const Settings: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">⚙️ Settings</h1>
      
      {/* Profile Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Name</label>
            <input type="text" defaultValue="Marco" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Email</label>
            <input type="email" defaultValue="marco@test.com" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg">
            Save Changes
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'Low food alerts', desc: 'Get notified when food is low' },
            { label: 'Low water alerts', desc: 'Get notified when water is low' },
            { label: 'Device offline', desc: 'Get notified when a device goes offline' },
            { label: 'Schedule reminders', desc: 'Get notified about scheduled feedings' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-white">{item.label}</p>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
              <button className="w-12 h-6 bg-green-600 rounded-full relative">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">API URL</label>
            <input type="text" defaultValue="http://localhost:3000" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">API Key</label>
            <input type="password" defaultValue="••••••••••••" className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg">
            Update API Settings
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-slate-800 rounded-xl p-6 border border-red-800">
        <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
        <div className="flex gap-4">
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
            Delete All Data
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};
