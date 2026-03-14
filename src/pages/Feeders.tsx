import React from 'react';

export const Feeders: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">🐶 Smart Feeders</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Total Feeders</span>
          <p className="text-3xl font-bold text-white mt-2">12</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Online</span>
          <p className="text-3xl font-bold text-green-500 mt-2">10</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Low Food</span>
          <p className="text-3xl font-bold text-yellow-500 mt-2">2</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <span className="text-slate-400 text-sm">Offline</span>
          <p className="text-3xl font-bold text-red-500 mt-2">0</p>
        </div>
      </div>

      {/* Feeders List */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Registered Feeders</h2>
        <div className="space-y-3">
          {[
            { name: 'Living Room', status: 'online', food: 75 },
            { name: 'Kitchen', status: 'online', food: 45 },
            { name: 'Bedroom', status: 'offline', food: 20 },
            { name: 'Garden', status: 'online', food: 90 },
          ].map((feeder, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-2xl">🐶</span>
                <div>
                  <p className="text-white font-medium">{feeder.name}</p>
                  <p className="text-slate-400 text-sm capitalize">{feeder.status}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{feeder.food}%</p>
                <p className="text-slate-400 text-sm">Food Level</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg">
          + Add Feeder
        </button>
        <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg">
          Feed Now
        </button>
      </div>
    </div>
  );
};
