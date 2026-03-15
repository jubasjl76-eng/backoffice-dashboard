/**
 * Camera Monitoring - Live Streams & Snapshots
 */

import { useState, useEffect } from 'react';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  streamUrl?: string;
  snapshotUrl?: string;
  lastMotion?: string;
  resolution: string;
}

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    // Mock data - would connect to camera service API
    setCameras([
      {
        id: 'cam-01',
        name: 'Front Door',
        location: 'Kennel Entrance',
        status: 'online',
        streamUrl: '/streams/cam-01/index.m3u8',
        lastMotion: '10 min ago',
        resolution: '1920x1080',
      },
      {
        id: 'cam-02',
        name: 'Main Area',
        location: 'Inside Kennel',
        status: 'online',
        streamUrl: '/streams/cam-02/index.m3u8',
        lastMotion: '2 min ago',
        resolution: '1920x1080',
      },
      {
        id: 'cam-03',
        name: 'Feeding Area',
        location: 'Near Feeder',
        status: 'offline',
        lastMotion: '1 hour ago',
        resolution: '1280x720',
      },
      {
        id: 'cam-04',
        name: 'Back Yard',
        location: 'Outside',
        status: 'online',
        streamUrl: '/streams/cam-04/index.m3u8',
        lastMotion: '5 min ago',
        resolution: '1920x1080',
      },
    ]);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-6">Loading cameras...</div>;
  }

  const onlineCameras = cameras.filter(c => c.status === 'online');
  const offlineCameras = cameras.filter(c => c.status === 'offline');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📹 Camera Monitoring</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            ✅ {onlineCameras.length} Online
          </span>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            ❌ {offlineCameras.length} Offline
          </span>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map(camera => (
          <CameraCard
            key={camera.id}
            camera={camera}
            isSelected={selectedCamera === camera.id}
            onClick={() => setSelectedCamera(camera.id)}
          />
        ))}
      </div>

      {/* Selected Camera View */}
      {selectedCamera && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
            <div>
              <h2 className="text-lg font-semibold">
                {cameras.find(c => c.id === selectedCamera)?.name}
              </h2>
              <p className="text-sm text-gray-300">
                {cameras.find(c => c.id === selectedCamera)?.location}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600">
                ▶ Live
              </button>
              <button className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700">
                📸 Snapshot
              </button>
              <button
                onClick={() => setSelectedCamera(null)}
                className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="aspect-video bg-black flex items-center justify-center">
            {cameras.find(c => c.id === selectedCamera)?.status === 'online' ? (
              <div className="text-white text-center">
                <div className="text-6xl mb-4">📹</div>
                <p>Live Stream would play here</p>
                <p className="text-sm text-gray-400">
                  {cameras.find(c => c.id === selectedCamera)?.streamUrl}
                </p>
              </div>
            ) : (
              <div className="text-red-400 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <p>Camera Offline</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera List Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Cameras</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Last Motion</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Resolution</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map(camera => (
              <tr key={camera.id} className="border-t">
                <td className="px-4 py-3 font-medium">{camera.name}</td>
                <td className="px-4 py-3 text-gray-600">{camera.location}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    camera.status === 'online' ? 'bg-green-100 text-green-700' :
                    camera.status === 'offline' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {camera.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{camera.lastMotion || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{camera.resolution}</td>
                <td className="px-4 py-3">
                  <button className="text-blue-500 hover:text-blue-700 text-sm">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CameraCard({ camera, isSelected, onClick }: { camera: Camera; isSelected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
      }`}
    >
      <div className="aspect-video bg-gray-900 relative">
        {camera.status === 'online' ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">📹</span>
            </div>
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                LIVE
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <span className="text-4xl mb-2">📷</span>
            <span className="text-sm">Offline</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium">{camera.name}</div>
        <div className="text-sm text-gray-600">{camera.location}</div>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>📍 {camera.resolution}</span>
          {camera.lastMotion && <span>🏃 {camera.lastMotion}</span>}
        </div>
      </div>
    </div>
  );
}
