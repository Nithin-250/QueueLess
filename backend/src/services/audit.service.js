const { refs } = require('../config/dynamodb');

/**
 * Audit Logging Service
 *
 * Logs all administrative and staff actions for accountability.
 * Faculty can review these logs to track who did what and when.
 */

async function logAuditEvent({ action, actor, actorType, details, timestamp }) {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const event = {
      id,
      action, // e.g., 'token_called', 'queue_paused', 'admin_created'
      actor, // username
      actorType, // 'admin' or 'staff'
      details, // object with relevant details
      timestamp: timestamp || Date.now(),
    };

    // Store audit logs in DynamoDB
    await refs.setAuditLog(id, event);
  } catch (error) {
    console.error('[audit] Failed to log event:', error.message);
    // Don't throw - audit logging failures shouldn't break the main flow
  }
}

async function getAuditLogs({ limit = 100, actor = null, action = null, startDate = null, endDate = null } = {}) {
  try {
    const allLogs = await refs.auditLogs();

    let filtered = allLogs;

    // Filter by actor if specified
    if (actor) {
      filtered = filtered.filter(log => log.actor === actor);
    }

    // Filter by action if specified
    if (action) {
      filtered = filtered.filter(log => log.action === action);
    }

    // Filter by date range if specified
    if (startDate) {
      filtered = filtered.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(log => log.timestamp <= endDate);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  } catch (error) {
    console.error('[audit] Failed to fetch logs:', error.message);
    return [];
  }
}

module.exports = { logAuditEvent, getAuditLogs };
