import React, { useState, useEffect } from 'react';
import { Server, Play, Square, RotateCcw, Trash2, Plus, Settings, Eye, Activity, Cpu, HardDrive, Network } from 'lucide-react';

const HoneypotStatus = ({ socket }) => {
  const [honeypots, setHoneypots] = useState([]);
  const [selectedHoneypot, setSelectedHoneypot] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [honeypotLogs, setHoneypotLogs] = useState('');
  const [resourceMetrics, setResourceMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [newHoneypot, setNewHoneypot] = useState({
    type: 'ssh',
    name: '',
    port: '',
    config: {}
  });

  const honeypotTypes = {
    ssh: { name: 'SSH Honeypot', icon: '🔑', defaultPort: 2222, color: 'bg-blue-500' },
    web: { name: 'Web Honeypot', icon: '🌐', defaultPort: 8080, color: 'bg-green-500' },
    ftp: { name: 'FTP Honeypot', icon: '📁', defaultPort: 2121, color: 'bg-yellow-500' },
    smb: { name: 'SMB Honeypot', icon: '🗂️', defaultPort: 4445, color: 'bg-purple-500' },
    telnet: { name: 'Telnet Honeypot', icon: '💻', defaultPort: 2323, color: 'bg-red-500' },
    mysql: { name: 'MySQL Honeypot', icon: '🗄️', defaultPort: 3306, color: 'bg-orange-500' }
  };

  useEffect(() => {
    fetchHoneypots();
    fetchResourceMetrics();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchHoneypots();
      fetchResourceMetrics();
    }, 10000);

    if (socket) {
      socket.on('honeypot-status-update', handleStatusUpdate);
      socket.on('honeypot-created', handleHoneypotCreated);
      socket.on('honeypot-destroyed', handleHoneypotDestroyed);
      
      return () => {
        clearInterval(interval);
        socket.off('honeypot-status-update', handleStatusUpdate);
        socket.off('honeypot-created', handleHoneypotCreated);
        socket.off('honeypot-destroyed', handleHoneypotDestroyed);
      };
    }

    return () => clearInterval(interval);
  }, [socket]);

  const fetchHoneypots = async () => {
    try {
      const response = await fetch('/api/honeypots');
      const data = await response.json();
      setHoneypots(data.honeypots || []);
    } catch (error) {
      console.error('Failed to fetch honeypots:', error);
      // Fallback to mock data
      generateMockHoneypots();
    } finally {
      setLoading(false);
    }
  };

  const generateMockHoneypots = () => {
    const mockHoneypots = [
      {
        id: 'hp-1',
        name: 'honeypot-ssh-main',
        type: 'ssh',
        status: 'running',
        ports: [2222],
        created: new Date(Date.now() - 86400000).toISOString(),
        attacks_count: 145,
        last_activity: new Date(Date.now() - 3600000).toISOString(),
        cpu_usage: 12.5,
        memory_usage: 256,
        network_in: 1024,
        network_out: 512
      },
      {
        id: 'hp-2',
        name: 'honeypot-web-nginx',
        type: 'web',
        status: 'running',
        ports: [8080],
        created: new Date(Date.now() - 172800000).toISOString(),
        attacks_count: 89,
        last_activity: new Date(Date.now() - 1800000).toISOString(),
        cpu_usage: 8.3,
        memory_usage: 128,
        network_in: 2048,
        network_out: 1024
      },
      {
        id: 'hp-3',
        name: 'honeypot-ftp-server',
        type: 'ftp',
        status: 'stopped',
        ports: [2121],
        created: new Date(Date.now() - 259200000).toISOString(),
        attacks_count: 34,
        last_activity: new Date(Date.now() - 7200000).toISOString(),
        cpu_usage: 0,
        memory_usage: 0,
        network_in: 0,
        network_out: 0
      },
      {
        id: 'hp-4',
        name: 'honeypot-smb-share',
        type: 'smb',
        status: 'running',
        ports: [4445],
        created: new Date(Date.now() - 345600000).toISOString(),
        attacks_count: 67,
        last_activity: new Date(Date.now() - 900000).toISOString(),
        cpu_usage: 15.7,
        memory_usage: 192,
        network_in: 512,
        network_out: 256
      }
    ];
    setHoneypots(mockHoneypots);
  };

  const fetchResourceMetrics = async () => {
    try {
      const response = await fetch('/api/honeypots/metrics');
      const data = await response.json();
      setResourceMetrics(data.metrics || {});
    } catch (error) {
      console.error('Failed to fetch resource metrics:', error);
    }
  };

  const handleStatusUpdate = (update) => {
    setHoneypots(prev =>
      prev.map(hp =>
        hp.id === update.containerId ? { ...hp, status: update.action === 'start' ? 'running' : 'stopped' } : hp
      )
    );
  };

  const handleHoneypotCreated = (honeypot) => {
    setHoneypots(prev => [...prev, honeypot]);
  };

  const handleHoneypotDestroyed = (honeypotId) => {
    setHoneypots(prev => prev.filter(hp => hp.id !== honeypotId));
  };

  const startHoneypot = async (honeypotId) => {
    try {
      await fetch(`/api/honeypots/${honeypotId}/start`, { method: 'POST' });
      setHoneypots(prev =>
        prev.map(hp => hp.id === honeypotId ? { ...hp, status: 'starting' } : hp)
      );
    } catch (error) {
      console.error('Failed to start honeypot:', error);
    }
  };

  const stopHoneypot = async (honeypotId) => {
    try {
      await fetch(`/api/honeypots/${honeypotId}/stop`, { method: 'POST' });
      setHoneypots(prev =>
        prev.map(hp => hp.id === honeypotId ? { ...hp, status: 'stopping' } : hp)
      );
    } catch (error) {
      console.error('Failed to stop honeypot:', error);
    }
  };

  const restartHoneypot = async (honeypotId) => {
    try {
      await fetch(`/api/honeypots/${honeypotId}/restart`, { method: 'POST' });
      setHoneypots(prev =>
        prev.map(hp => hp.id === honeypotId ? { ...hp, status: 'restarting' } : hp)
      );
    } catch (error) {
      console.error('Failed to restart honeypot:', error);
    }
  };

  const deleteHoneypot = async (honeypotId) => {
    if (!confirm('Are you sure you want to delete this honeypot?')) return;
    
    try {
      await fetch(`/api/honeypots/${honeypotId}`, { method: 'DELETE' });
      setHoneypots(prev => prev.filter(hp => hp.id !== honeypotId));
    } catch (error) {
      console.error('Failed to delete honeypot:', error);
    }
  };

  const createHoneypot = async () => {
    try {
      const response = await fetch('/api/honeypots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHoneypot)
      });

      if (response.ok) {
        const honeypot = await response.json();
        setHoneypots(prev => [...prev, honeypot]);
        setShowCreateModal(false);
        setNewHoneypot({ type: 'ssh', name: '', port: '', config: {} });
      }
    } catch (error) {
      console.error('Failed to create honeypot:', error);
    }
  };

  const viewLogs = async (honeypotId) => {
    try {
      const response = await fetch(`/api/honeypots/${honeypotId}/logs`);
      const data = await response.text();
      setHoneypotLogs(data);
      setShowLogsModal(true);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setHoneypotLogs('Failed to load logs');
      setShowLogsModal(true);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      case 'starting': case 'stopping': case 'restarting': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (created) => {
    const now = new Date();
    const createdDate = new Date(created);
    const diff = now - createdDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const runningCount = honeypots.filter(hp => hp.status === 'running').length;
  const totalAttacks = honeypots.reduce((sum, hp) => sum + (hp.attacks_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Server className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Honeypot Status</h2>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Honeypot</span>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{honeypots.length}</div>
            <p className="text-sm text-gray-500">Total Honeypots</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{runningCount}</div>
            <p className="text-sm text-gray-500">Running</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalAttacks}</div>
            <p className="text-sm text-gray-500">Total Attacks</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(honeypotTypes).length}
            </div>
            <p className="text-sm text-gray-500">Types Available</p>
          </div>
        </div>
      </div>

      {/* Honeypot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {honeypots.map((honeypot) => {
          const typeInfo = honeypotTypes[honeypot.type] || honeypotTypes.ssh;
          
          return (
            <div key={honeypot.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className={`${typeInfo.color} px-4 py-3`}>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{typeInfo.icon}</span>
                    <h3 className="font-semibold truncate">{honeypot.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(honeypot.status)}`}>
                    {honeypot.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="space-y-3">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{typeInfo.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ports:</span>
                      <p className="font-medium">{honeypot.ports?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Uptime:</span>
                      <p className="font-medium">{formatUptime(honeypot.created)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Attacks:</span>
                      <p className="font-medium text-red-600">{honeypot.attacks_count || 0}</p>
                    </div>
                  </div>

                  {/* Resource Usage */}
                  {honeypot.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center space-x-1">
                          <Cpu className="w-3 h-3" />
                          <span>CPU:</span>
                        </span>
                        <span>{honeypot.cpu_usage?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full"
                          style={{ width: `${Math.min(honeypot.cpu_usage || 0, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center space-x-1">
                          <HardDrive className="w-3 h-3" />
                          <span>Memory:</span>
                        </span>
                        <span>{formatBytes(honeypot.memory_usage * 1024 * 1024 || 0)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center space-x-1">
                          <Network className="w-3 h-3" />
                          <span>Network:</span>
                        </span>
                        <span>
                          ↓{formatBytes(honeypot.network_in || 0)} 
                          ↑{formatBytes(honeypot.network_out || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Last Activity */}
                  {honeypot.last_activity && (
                    <div className="text-xs text-gray-500">
                      Last activity: {formatTimestamp(honeypot.last_activity)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    {honeypot.status === 'running' ? (
                      <button
                        onClick={() => stopHoneypot(honeypot.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Stop"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startHoneypot(honeypot.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Start"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => restartHoneypot(honeypot.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Restart"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => viewLogs(honeypot.id)}
                      className="text-gray-600 hover:text-gray-800"
                      title="View Logs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedHoneypot(honeypot)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteHoneypot(honeypot.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Honeypot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Honeypot</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newHoneypot.type}
                    onChange={(e) => setNewHoneypot(prev => ({
                      ...prev,
                      type: e.target.value,
                      port: honeypotTypes[e.target.value].defaultPort.toString()
                    }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    {Object.entries(honeypotTypes).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newHoneypot.name}
                    onChange={(e) => setNewHoneypot(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="honeypot-ssh-1"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    value={newHoneypot.port}
                    onChange={(e) => setNewHoneypot(prev => ({ ...prev, port: e.target.value }))}
                    placeholder={honeypotTypes[newHoneypot.type].defaultPort.toString()}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createHoneypot}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full m-4 max-h-96 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Honeypot Logs</h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs font-mono bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                {honeypotLogs || 'No logs available'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {selectedHoneypot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Honeypot Settings</h3>
                <button
                  onClick={() => setSelectedHoneypot(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedHoneypot.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm bg-gray-50 p-2 rounded">
                    {honeypotTypes[selectedHoneypot.type]?.name || selectedHoneypot.type}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-2 py-1 rounded text-sm ${getStatusColor(selectedHoneypot.status)}`}>
                    {selectedHoneypot.status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm bg-gray-50 p-2 rounded">
                    {formatTimestamp(selectedHoneypot.created)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HoneypotStatus;