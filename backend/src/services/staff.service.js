const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { refs } = require('../config/dynamodb');

const BCRYPT_ROUNDS = 10;

async function createStaff({ username, password, service, displayName, pin }) {
  const account = await refs.staffMember(username);
  if (account) {
    const err = new Error('Staff account already exists.');
    err.statusCode = 409;
    throw err;
  }
  if (pin && (!/^\d{4,6}$/.test(pin))) {
    throw Object.assign(new Error('PIN must be 4–6 digits.'), { statusCode: 400 });
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const pinHash = pin ? await bcrypt.hash(pin, BCRYPT_ROUNDS) : null;
  const record = {
    username,
    passwordHash,
    pinHash,
    displayName: displayName || username,
    service,
    role: 'staff',
    createdAt: Date.now(),
  };
  await refs.setStaff(record);
  return { username, displayName: record.displayName, service, role: 'staff', createdAt: record.createdAt, hasPin: !!pin };
}

async function loginByPin(pin) {
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    throw Object.assign(new Error('Invalid PIN format.'), { statusCode: 400 });
  }
  const all = await refs.staff();
  // Check every account that has a pinHash — first match wins.
  for (const account of all) {
    if (!account.pinHash) continue;
    const ok = await bcrypt.compare(pin, account.pinHash);
    if (ok) {
      const token = jwt.sign(
        { sub: account.username, role: 'staff', service: account.service, displayName: account.displayName },
        config.jwt.secret,
        { expiresIn: '12h' }
      );
      return {
        token,
        user: { username: account.username, role: 'staff', service: account.service, displayName: account.displayName },
      };
    }
  }
  throw Object.assign(new Error('Invalid PIN.'), { statusCode: 401 });
}

async function loginStaff(username, password) {
  const account = await refs.staffMember(username);

  // Constant-time compare to prevent user enumeration via timing.
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuuW2j7n5p9LK0L1PZmQDqfyV5bKzN6eLm';
  const hash = account?.passwordHash || dummyHash;
  const ok = await bcrypt.compare(password, hash);

  if (!account || !ok) {
    const err = new Error('Invalid username or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { sub: username, role: 'staff', service: account.service, displayName: account.displayName },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    expiresIn: config.jwt.expiresIn,
    user: { username, role: 'staff', service: account.service, displayName: account.displayName },
  };
}

async function listStaff() {
  const [all, presence] = await Promise.all([
    refs.staff(),
    refs.presence(),
  ]);
  const presenceMap = {};
  presence.forEach(p => { presenceMap[p.username] = p; });
  return all.map(({ passwordHash, pinHash, ...rest }) => ({
    ...rest,
    online: presenceMap[rest.username]?.online || false,
    lastSeen: presenceMap[rest.username]?.lastSeen || null,
  }));
}

async function deleteStaff(username) {
  await refs.deleteStaff(username);
  await refs.setPresence({ username, online: false, lastSeen: null });
}

async function assignStaffToQueue(username, service) {
  const svc = String(service || '').trim();
  if (!svc) throw Object.assign(new Error('service is required.'), { statusCode: 400 });
  const account = await refs.staffMember(username);
  if (!account) throw Object.assign(new Error('Staff account not found.'), { statusCode: 404 });
  await refs.setStaff({ ...account, service: svc });
  return { username, service: svc };
}

async function getStaffProfile(username) {
  const a = await refs.staffMember(username);
  if (!a) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
  return { username: a.username, displayName: a.displayName || a.username, service: a.service, role: 'staff', createdAt: a.createdAt };
}

async function updateStaffProfile(username, { displayName }) {
  if (!displayName || !displayName.trim()) throw Object.assign(new Error('Display name is required.'), { statusCode: 400 });
  if (displayName.trim().length > 50) throw Object.assign(new Error('Display name must be 50 characters or less.'), { statusCode: 400 });
  const account = await refs.staffMember(username);
  await refs.setStaff({ ...account, displayName: displayName.trim() });
  return { displayName: displayName.trim() };
}

async function changeStaffPassword(username, currentPassword, newPassword) {
  const account = await refs.staffMember(username);
  if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 401 });
  if (newPassword.length < 8) throw Object.assign(new Error('New password must be at least 8 characters.'), { statusCode: 400 });
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await refs.setStaff({ ...account, passwordHash });
}

module.exports = { createStaff, loginStaff, loginByPin, listStaff, deleteStaff, getStaffProfile, updateStaffProfile, changeStaffPassword, assignStaffToQueue };
