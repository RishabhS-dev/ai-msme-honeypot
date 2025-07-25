// Frontend API service for AI Honeypot MSME system

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method for making API requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Dashboard APIs
  async getDashboardStats(timeframe = '24h') {
    return this.request(`/api/dashboard/stats?timeframe=${timeframe}`);
  }

  async getDashboardMetrics() {
    return this.request('/api/dashboard/metrics');
  }

  // Honeypot APIs
  async getHoneypots() {
    return this.request('/api/honeypots');
  }

  async getHoneypotById(id) {
    return this.request(`/api/honeypots/${id}`);
  }

  async createHoneypot(honeypotData) {
    return this.request('/api/honeypots', {
      method: 'POST',
      body: JSON.stringify(honeypotData),
    });
  }

  async updateHoneypot(id, honeypotData) {
    return this.request(`/api/honeypots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(honeypotData),
    });
  }

  async deleteHoneypot(id) {
    return this.request(`/api/honeypots/${id}`, {
      method: 'DELETE',
    });
  }

  async startHoneypot(id) {
    return this.request(`/api/honeypots/${id}/start`, {
      method: 'POST',
    });
  }

  async stopHoneypot(id) {
    return this.request(`/api/honeypots/${id}/stop`, {
      method: 'POST',
    });
  }

  async restartHoneypot(id) {
    return this.request(`/api/honeypots/${id}/restart`, {
      method: 'POST',
    });
  }

  async getHoneypotLogs(id, lines = 100) {
    return this.request(`/api/honeypots/${id}/logs?lines=${lines}`);
  }

  async getHoneypotMetrics() {
    return this.request('/api/honeypots/metrics');
  }

  // Alert APIs
  async getAlerts(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/alerts${queryParams ? `?${queryParams}` : ''}`);
  }

  async getAlertById(id) {
    return this.request(`/api/alerts/${id}`);
  }

  async markAlertAsRead(id) {
    return this.request(`/api/alerts/${id}/read`, {
      method: 'POST',
    });
  }

  async dismissAlert(id) {
    return this.request(`/api/alerts/${id}/dismiss`, {
      method: 'POST',
    });
  }

  async createAlert(alertData) {
    return this.request('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // Attack APIs
  async getAttacks(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/api/attacks${queryParams ? `?${queryParams}` : ''}`);
  }

  async getAttackGeolocation(timeframe = '24h') {
    return this.request(`/api/attacks/geolocation?timeframe=${timeframe}`);
  }

  async getAttackStats(timeframe = '24h') {
    return this.request(`/api/attacks/stats?timeframe=${timeframe}`);
  }

  async getAttacksByCountry() {
    return this.request('/api/attacks/by-country');
  }

  async getAttackTrends(timeframe = '7d') {
    return this.request(`/api/attacks/trends?timeframe=${timeframe}`);
  }

  // AI Analysis APIs
  async getThreatAnalysis(timeframe = '24h') {
    return this.request(`/api/analysis/threats?timeframe=${timeframe}`);
  }

  async getAnomalyDetection() {
    return this.request('/api/analysis/anomalies');
  }

  async getPredictions() {
    return this.request('/api/analysis/predictions');
  }

  async getRecommendations() {
    return this.request('/api/analysis/recommendations');
  }

  async getAttackPatterns(timeframe = '24h') {
    return this.request(`/api/analysis/patterns?timeframe=${timeframe}`);
  }

  async getRiskAssessment() {
    return this.request('/api/analysis/risk-assessment');
  }

  // AI Engine APIs
  async triggerAnalysis() {
    return this.request('/api/ai/analyze', {
      method: 'POST',
    });
  }

  async adaptNetwork(recommendation) {
    return this.request('/api/ai/adapt', {
      method: 'POST',
      body: JSON.stringify(recommendation),
    });
  }

  async getModelStatus() {
    return this.request('/api/ai/model/status');
  }

  async retrainModel() {
    return this.request('/api/ai/model/retrain', {
      method: 'POST',
    });
  }

  // Configuration APIs
  async getConfiguration() {
    return this.request('/api/config');
  }

  async updateConfiguration(config) {
    return this.request('/api/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getHoneypotTemplates() {
    return this.request('/api/config/honeypot-templates');
  }

  // System APIs
  async getSystemHealth() {
    return this.request('/api/system/health');
  }

  async getSystemMetrics() {
    return this.request('/api/system/metrics');
  }

  async getSystemLogs() {
    return this.request('/api/system/logs');
  }

  // Search and Filter APIs
  async searchAttacks(query, filters = {}) {
    return this.request('/api/search/attacks', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  async searchAlerts(query, filters = {}) {
    return this.request('/api/search/alerts', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  // Export APIs
  async exportAttackData(format = 'json', timeframe = '24h') {
    return this.request(`/api/export/attacks?format=${format}&timeframe=${timeframe}`);
  }

  async exportAlertData(format = 'json', timeframe = '24h') {
    return this.request(`/api/export/alerts?format=${format}&timeframe=${timeframe}`);
  }

  async exportReport(type = 'summary', timeframe = '24h') {
    return this.request(`/api/export/report?type=${type}&timeframe=${timeframe}`);
  }

  // Real-time data subscription helpers
  subscribeToUpdates(socket, callbacks = {}) {
    if (!socket) return;

    // Honeypot status updates
    socket.on('honeypot-status-update', (data) => {
      if (callbacks.onHoneypotStatusUpdate) {
        callbacks.onHoneypotStatusUpdate(data);
      }
    });

    // New attacks
    socket.on('new-attack', (data) => {
      if (callbacks.onNewAttack) {
        callbacks.onNewAttack(data);
      }
    });

    // New alerts
    socket.on('new-alert', (data) => {
      if (callbacks.onNewAlert) {
        callbacks.onNewAlert(data);
      }
    });

    // AI analysis updates
    socket.on('threat-analysis-update', (data) => {
      if (callbacks.onThreatAnalysisUpdate) {
        callbacks.onThreatAnalysisUpdate(data);
      }
    });

    // Network adaptation events
    socket.on('network-adaptation', (data) => {
      if (callbacks.onNetworkAdaptation) {
        callbacks.onNetworkAdaptation(data);
      }
    });

    // System metrics updates
    socket.on('system-metrics', (data) => {
      if (callbacks.onSystemMetrics) {
        callbacks.onSystemMetrics(data);
      }
    });
  }

  unsubscribeFromUpdates(socket) {
    if (!socket) return;

    socket.off('honeypot-status-update');
    socket.off('new-attack');
    socket.off('new-alert');
    socket.off('threat-analysis-update');
    socket.off('network-adaptation');
    socket.off('system-metrics');
  }

  // Utility methods
  formatError(error) {
    if (error.response && error.response.data) {
      return error.response.data.message || 'An error occurred';
    }
    return error.message || 'An error occurred';
  }

  isOnline() {
    return navigator.onLine;
  }

  // Cache management
  clearCache() {
    // Clear any cached data if implementing client-side caching
    localStorage.removeItem('api_cache');
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export individual methods for easier importing
export const {
  // Dashboard
  getDashboardStats,
  getDashboardMetrics,
  
  // Honeypots
  getHoneypots,
  getHoneypotById,
  createHoneypot,
  updateHoneypot,
  deleteHoneypot,
  startHoneypot,
  stopHoneypot,
  restartHoneypot,
  getHoneypotLogs,
  getHoneypotMetrics,
  
  // Alerts
  getAlerts,
  getAlertById,
  markAlertAsRead,
  dismissAlert,
  createAlert,
  
  // Attacks
  getAttacks,
  getAttackGeolocation,
  getAttackStats,
  getAttacksByCountry,
  getAttackTrends,
  
  // AI Analysis
  getThreatAnalysis,
  getAnomalyDetection,
  getPredictions,
  getRecommendations,
  getAttackPatterns,
  getRiskAssessment,
  
  // AI Engine
  triggerAnalysis,
  adaptNetwork,
  getModelStatus,
  retrainModel,
  
  // Configuration
  getConfiguration,
  updateConfiguration,
  getHoneypotTemplates,
  
  // System
  getSystemHealth,
  getSystemMetrics,
  getSystemLogs,
  
  // Search
  searchAttacks,
  searchAlerts,
  
  // Export
  exportAttackData,
  exportAlertData,
  exportReport,
  
  // Utilities
  subscribeToUpdates,
  unsubscribeFromUpdates,
  formatError,
  isOnline,
  clearCache
} = apiService;

export default apiService;