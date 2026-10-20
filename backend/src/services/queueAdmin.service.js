/**
 * Queue management service (DynamoDB version - STUB)
 *
 * NOTE: This is a simplified stub implementation. Full feature parity with Firebase
 * version requires complete rewrite. Your friend should complete this migration.
 */
const crypto = require('crypto');
const { refs } = require('../config/dynamodb');
const queueService = require('./queue.service');
const { emit, EVENTS } = require('../events/bus');

const KEY_RE = /^[a-z0-9_]{1,40}$/;
const PREFIX_RE = /^[A-Z0-9]{1,4}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function badRequest(msg) {
  return Object.assign(new Error(msg), { statusCode: 400 });
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function parseWorkingHours(wh) {
  if (wh === null || wh === undefined) return null;
  if (typeof wh !== 'object' || !wh.open || !wh.close) {
    throw badRequest('workingHours must be { open: "HH:MM", close: "HH:MM" } or null.');
  }
  if (!HHMM_RE.test(wh.open) || !HHMM_RE.test(wh.close)) {
    throw badRequest('workingHours open/close must be in HH:MM (24h) format.');
  }
  return { open: wh.open, close: wh.close };
}

function parseCapacity(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 0) throw badRequest('capacity must be a non-negative integer or null.');
  return n;
}

async function createQueue({ name, key, prefix, color, capacity, workingHours, description }) {
  if (!name || !name.trim()) throw badRequest('name is required.');
  if (!key || !key.trim()) throw badRequest('key is required.');
  if (!KEY_RE.test(key)) throw badRequest('key must be 1-40 lowercase alphanumeric/underscore characters.');
  if (prefix && !PREFIX_RE.test(prefix)) throw badRequest('prefix must be 1-4 uppercase alphanumeric characters.');

  const existing = await refs.queueDef(key);
  if (existing) throw Object.assign(new Error('Queue key already exists.'), { statusCode: 409 });

  const id = crypto.randomUUID();
  const queue = {
    id,
    key,
    name: name.trim(),
    prefix: prefix || null,
    color: color || null,
    capacity: parseCapacity(capacity),
    workingHours: parseWorkingHours(workingHours),
    description: description ? description.trim().slice(0, 300) : null,
    active: true,
    createdAt: Date.now(),
  };

  await refs.setQueue(queue);
  emit(EVENTS.QUEUE_CREATED, queue);
  return queue;
}

async function updateQueue(id, updates) {
  const existing = await refs.queueDef(id);
  if (!existing) throw Object.assign(new Error('Queue not found.'), { statusCode: 404 });

  const patch = { ...existing };
  if (updates.name !== undefined) {
    if (!updates.name.trim()) throw badRequest('name cannot be empty.');
    patch.name = updates.name.trim();
  }
  if (updates.color !== undefined) patch.color = updates.color || null;
  if (updates.capacity !== undefined) patch.capacity = parseCapacity(updates.capacity);
  if (updates.workingHours !== undefined) patch.workingHours = parseWorkingHours(updates.workingHours);
  if (updates.description !== undefined) patch.description = updates.description ? updates.description.trim().slice(0, 300) : null;
  if (updates.active !== undefined) patch.active = Boolean(updates.active);

  await refs.setQueue(patch);
  emit(EVENTS.QUEUE_UPDATED, patch);
  return patch;
}

async function deleteQueue(id) {
  const existing = await refs.queueDef(id);
  if (!existing) throw Object.assign(new Error('Queue not found.'), { statusCode: 404 });

  // Check if any tokens reference this queue
  const allTokens = await refs.tokens();
  const inUse = allTokens.some(t => t.service === existing.key);
  if (inUse) {
    throw Object.assign(
      new Error('Cannot delete queue with active tokens. Reset the queue first.'),
      { statusCode: 409 }
    );
  }

  // Need to add deleteQueue to dynamodb.js refs
  // For now, just mark as inactive
  await refs.setQueue({ ...existing, active: false });
  emit(EVENTS.QUEUE_DELETED, { id, key: existing.key });
}

async function listQueues() {
  const all = await refs.queues();
  return all.filter(q => q.active !== false);
}

async function getQueue(id) {
  const q = await refs.queueDef(id);
  if (!q) throw Object.assign(new Error('Queue not found.'), { statusCode: 404 });
  return q;
}

module.exports = {
  createQueue,
  updateQueue,
  deleteQueue,
  listQueues,
  getQueue,
};
