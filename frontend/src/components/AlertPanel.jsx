import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Shield, X, Eye, Filter, Search } from 'lucide-react';

const AlertPanel = ({ socket }) => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Load initial alerts
    fetchAlerts();

    // Socket listeners for real-time updates
    if (socket) {
      socket.on('new-alert', handleNewAlert);
      socket.on('alert-updated', handleAlertUpdate);
      
      return () => {
        socket.off('new-alert', handleNewAlert);
        socket.off('alert-updated', handleAlertUpdate);
      };
    }
  }, [socket]);

  useEffect(() => {
    filterAlerts();
  }, [alerts, filter, searchTerm]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const handleNewAlert = (alert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 100)); // Keep last 100 alerts
    
    // Show browser notification for critical alerts
    if (alert.severity === 'critical' && Notification.permission === 'granted') {
      new Notification('Critical Security Alert', {
        body: alert.message,
        icon: '/favicon.ico'
      });
    }
  };

  const handleAlertUpdate = (updatedAlert) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === updatedAlert.id ? updatedAlert : alert
      )
    );
  };

  const filterAlerts = () => {
    let filtered = alerts;

    // Filter by severity
    if (filter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.source_ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.honeypot_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAlerts(filtered);
  };

  const markAsRead = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: 'POST' });
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, read: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const dismissAlert = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/dismiss`, { method: 'POST' });
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <Shield className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Security Alerts</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2 flex-1">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded px-3 py-1 text-sm flex-1"
            />
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className={`${isExpanded ? 'max-h-96' : 'max-h-48'} overflow-y-auto`}>
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No alerts found</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                !alert.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                      <span className="ml-1 capitalize">{alert.severity}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1">
                    {alert.title || alert.attack_type || 'Security Event'}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {alert.source_ip && (
                      <span>IP: {alert.source_ip}</span>
                    )}
                    {alert.honeypot_name && (
                      <span>Honeypot: {alert.honeypot_name}</span>
                    )}
                    {alert.port && (
                      <span>Port: {alert.port}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!alert.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(alert.id);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Mark as read"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedAlert.severity)}`}>
                      {getSeverityIcon(selectedAlert.severity)}
                      <span className="ml-1 capitalize">{selectedAlert.severity}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="text-sm text-gray-900">{formatTimestamp(selectedAlert.timestamp)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <p className="text-sm text-gray-900">{selectedAlert.message}</p>
                </div>
                
                {selectedAlert.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Details</label>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedAlert.source_ip && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Source IP</label>
                      <p className="text-sm text-gray-900">{selectedAlert.source_ip}</p>
                    </div>
                  )}
                  {selectedAlert.honeypot_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Honeypot</label>
                      <p className="text-sm text-gray-900">{selectedAlert.honeypot_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertPanel;