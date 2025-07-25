const express = require('express');
const router = express.Router();
const honeypotManager = require('../services/honeypot-manager');
const dockerManager = require('../services/docker-manager');
const { executeQuery } = require('../services/elasticsearch');
const fs = require('fs').promises;
const path = require('path');

// Get all honeypots status
router.get('/', async (req, res) => {
  try {
    const honeypots = await honeypotManager.getAllHoneypots();
    res.json({
      success: true,
      data: honeypots
    });
  } catch (error) {
    console.error('Get honeypots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch honeypots' });
  }
});

// Spawn a new honeypot dynamically
router.post('/spawn', async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, message: 'Honeypot type is required' });
    }

    const newHoneypot = await honeypotManager.spawnHoneypot(type);
    res.json({ success: true, data: newHoneypot });
  } catch (error) {
    console.error('Spawn honeypot error:', error);
    res.status(500).json({ success: false, message: 'Failed to spawn honeypot' });
  }
});

// Stop (remove) a honeypot by container ID
router.post('/stop/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await honeypotManager.stopHoneypot(id);
    res.json({ success: true, message: 'Honeypot stopped', data: result });
  } catch (error) {
    console.error('Stop honeypot error:', error);
    res.status(500).json({ success: false, message: 'Failed to stop honeypot' });
  }
});

// Get honeypot logs by container ID
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await dockerManager.getContainerLogs(id);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get honeypot logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve logs' });
  }
});

// Query Elasticsearch logs for honeypots
router.post('/logs/search', async (req, res) => {
  try {
    const { query } = req.body;
    const results = await executeQuery(query);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Elasticsearch query error:', error);
    res.status(500).json({ success: false, message: 'Failed to execute search query' });
  }
});

// Get honeypot configuration file
router.get('/:type/config', async (req, res) => {
  try {
    const { type } = req.params;
    const configPath = path.join(__dirname, `../honeypots/${type}-honeypot/etc/config.json`);
    const configContent = await fs.readFile(configPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(configContent) });
  } catch (error) {
    console.error('Get honeypot config error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve config' });
  }
});

// Update honeypot configuration file
router.post('/:type/config', async (req, res) => {
  try {
    const { type } = req.params;
    const configPath = path.join(__dirname, `../honeypots/${type}-honeypot/etc/config.json`);
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Update honeypot config error:', error);
    res.status(500).json({ success: false, message: 'Failed to update config' });
  }
});

module.exports = router;
