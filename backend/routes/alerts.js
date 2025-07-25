const express = require('express');
const router = express.Router();
const alertService = require('../services/alert-service');
const { executeQuery } = require('../services/elasticsearch');

// Get all alerts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      severity,
      status = 'all',
      type,
      timeframe = '24h'
    } = req.query;

    let query = {
      query: {
        bool: {
          must: [
            { range: { created_at: { gte: `now-${timeframe}` } } }
          ]
        }
      },
      sort: [{ created_at: { order: 'desc' } }],
      from: (page - 1) * limit,
      size: parseInt(limit)
    };

    // Add filters
    if (severity) {
      query.query.bool.must.push({ term: { 'severity.keyword': severity } });
    }

    if (status !== 'all') {
      query.query.bool.must.push({ term: { 'status.keyword': status } });
    }

    if (type) {
      query.query.bool.must.push({ term: { 'alert_type.keyword': type } });
    }

    const result = await executeQuery('security-alerts-*', query);
    
    const alerts = result.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));

    res.json({
      success: true,
      data: {
        alerts,
        total: result.hits.total.value,
        page: parseInt(page),
        pages: Math.ceil(result.hits.total.value / limit),
        has_next: page * limit < result.hits.total.value
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Get alert statistics
router.get('/statistics', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    const query = {
      query: {
        range: { created_at: { gte: `now-${timeframe}` } }
      },
      aggs: {
        severity_distribution: {
          terms: { field: 'severity.keyword' }
        },
        status_distribution: {
          terms: { field: 'status.keyword' }
        },
        alert_types: {
          terms: { field: 'alert_type.keyword', size: 10 }
        },
        hourly_alerts: {
          date_histogram: {
            field: 'created_at',
            calendar_interval: '1h'
          }
        }
      }
    };

    const result = await executeQuery('security-alerts-*', query);

    res.json({
      success: true,
      data: {
        total_alerts: result.hits.total.value,
        severity_distribution: result.aggregations.severity_distribution.buckets,
        status_distribution: result.aggregations.status_distribution.buckets,
        alert_types: result.aggregations.alert_types.buckets,
        timeline: result.aggregations.hourly_alerts.buckets
      }
    });
  } catch (error) {
    console.error('Alert statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert statistics'
    });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      created_at: new Date().toISOString(),
      status: 'open',
      id: generateAlertId()
    };

    // Validate required fields
    const requiredFields = ['title', 'severity', 'alert_type', 'source_ip'];
    const missingFields = requiredFields.filter(field => !alertData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Store alert in Elasticsearch
    const indexName = `security-alerts-${new Date().toISOString().slice(0, 7)}`;
    await executeQuery(indexName, {}, 'POST', alertData);

    // Process alert through alert service
    await alertService.processAlert(alertData);

    res.status(201).json({
      success: true,
      data: alertData
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

// Get specific alert
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = {
      query: {
        term: { 'id.keyword': id }
      }
    };

    const result = await executeQuery('security-alerts-*', query);
    
    if (result.hits.total.value === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    const alert = {
      id: result.hits.hits[0]._id,
      ...result.hits.hits[0]._source
    };

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert'
    });
  }
});

// Update alert status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['open', 'investigating', 'resolved', 'false_positive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the alert first
    const findQuery = {
      query: {
        term: { 'id.keyword': id }
      }
    };

    const findResult = await executeQuery('security-alerts-*', findQuery);
    
    if (findResult.hits.total.value === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Update the alert
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...(notes && { resolution_notes: notes })
    };

    const docId = findResult.hits.hits[0]._id;
    const indexName = findResult.hits.hits[0]._index;
    
    await executeQuery(`${indexName}/_update/${docId}`, {
      doc: updateData
    }, 'POST');

    res.json({
      success: true,
      data: {
        id,
        status,
        updated_at: updateData.updated_at
      }
    });
  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert status'
    });
  }
});

// Bulk update alerts
router.patch('/bulk/status', async (req, res) => {
  try {
    const { alert_ids, status, notes } = req.body;

    if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'alert_ids must be a non-empty array'
      });
    }

    const validStatuses = ['open', 'investigating', 'resolved', 'false_positive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...(notes && { resolution_notes: notes })
    };

    // Build bulk update request
    const bulkBody = [];
    
    for (const alertId of alert_ids) {
      // First find the alert to get its index and doc ID
      const findQuery = {
        query: { term: { 'id.keyword': alertId } }
      };
      
      const findResult = await executeQuery('security-alerts-*', findQuery);
      
      if (findResult.hits.total.value > 0) {
        const hit = findResult.hits.hits[0];
        bulkBody.push({
          update: {
            _index: hit._index,
            _id: hit._id
          }
        });
        bulkBody.push({
          doc: updateData
        });
      }
    }

    if (bulkBody.length > 0) {
      await executeQuery('_bulk', bulkBody, 'POST');
    }

    res.json({
      success: true,
      data: {
        updated_count: bulkBody.length / 2,
        status,
        updated_at: updateData.updated_at
      }
    });
  } catch (error) {
    console.error('Bulk update alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update alerts'
    });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the alert first
    const findQuery = {
      query: {
        term: { 'id.keyword': id }
      }
    };

    const findResult = await executeQuery('security-alerts-*', findQuery);
    
    if (findResult.hits.total.value === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Delete the alert
    const docId = findResult.hits.hits[0]._id;
    const indexName = findResult.hits.hits[0]._index;
    
    await executeQuery(`${indexName}/_doc/${docId}`, {}, 'DELETE');

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert'
    });
  }
});

// Alert rules management
router.get('/rules', async (req, res) => {
  try {
    const rules = await alertService.getAlertRules();
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Get alert rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert rules'
    });
  }
});

router.post('/rules', async (req, res) => {
  try {
    const rule = await alertService.createAlertRule(req.body);
    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Create alert rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert rule'
    });
  }
});

router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await alertService.updateAlertRule(id, req.body);
    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Update alert rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert rule'
    });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await alertService.deleteAlertRule(id);
    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert rule'
    });
  }
});

// Test alert notification
router.post('/test-notification', async (req, res) => {
  try {
    const { notification_type, recipient } = req.body;
    
    const testAlert = {
      id: 'test-' + Date.now(),
      title: 'Test Alert Notification',
      severity: 'medium',
      alert_type: 'test',
      source_ip: '192.168.1.100',
      description: 'This is a test alert to verify notification settings',
      created_at: new Date().toISOString()
    };

    await alertService.sendNotification(testAlert, notification_type, recipient);

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// Get alert trends
router.get('/trends', async (req, res) => {
  try {
    const { timeframe = '7d', granularity = '1h' } = req.query;

    const query = {
      query: {
        range: { created_at: { gte: `now-${timeframe}` } }
      },
      aggs: {
        alert_trends: {
          date_histogram: {
            field: 'created_at',
            calendar_interval: granularity
          },
          aggs: {
            severity_breakdown: {
              terms: { field: 'severity.keyword' }
            }
          }
        }
      }
    };

    const result = await executeQuery('security-alerts-*', query);

    res.json({
      success: true,
      data: {
        timeline: result.aggregations.alert_trends.buckets,
        total_alerts: result.hits.total.value
      }
    });
  } catch (error) {
    console.error('Alert trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert trends'
    });
  }
});

// Helper function to generate alert ID
function generateAlertId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `alert_${timestamp}_${random}`;
}

module.exports = router;