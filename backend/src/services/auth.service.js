const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { refs } = require('../config/dynamodb');
const { ROLES } = require('../config/roles');

const BCRYPT_ROUNDS = 10;

async function bootstrapAdmin() {
  const { username, password } = config.bootstrapAdmin;
  const account = await refs.admin(username);
  if (account) {
    // Ensure the env-configured owner account is always a superadmin.
    if (account.role !== ROLES.SUPERADMIN) {
      await refs.setAdmin({ ...account, role: ROLES.SUPERADMIN });
      console.log(`[auth] Promoted bootstrap admin "${username}" to superadmin.`);
    } else {
      console.log(`[auth] Admin "${username}" already exists - skipping bootstrap.`);
    }
    return;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await refs.setAdmin({
    username,
    passwordHash,
    createdAt: Date.now(),
    role: ROLES.SUPERADMIN,
  });
  console.log(`[auth] Bootstrapped superadmin account "${username}".`);
}

async function login(username, password) {
  const account = await refs.admin(username);

  // Run bcrypt.compare against a dummy hash even when the username doesn't exist
  // so response time is constant — prevents user enumeration via timing.
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuuW2j7n5p9LK0L1PZmQDqfyV5bKzN6eLm';
  const hash = account?.passwordHash || dummyHash;
  const ok = await bcrypt.compare(password, hash);

  if (!account || !ok) {
    const err = new Error('Invalid username or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { sub: username, role: account.role || 'admin', displayName: account.displayName || username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    expiresIn: config.jwt.expiresIn,
    user: { username, role: account.role || 'admin', displayName: account.displayName || username },
  };
}

async function changePassword(username, currentPassword, newPassword) {
  const account = await refs.admin(username);
  if (!account) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });

  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 401 });

  if (newPassword.length < 8) throw Object.assign(new Error('New password must be at least 8 characters.'), { statusCode: 400 });

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await refs.setAdmin({ ...account, passwordHash });
}

async function getAdminProfile(username) {
  const a = await refs.admin(username);
  if (!a) throw Object.assign(new Error('Account not found.'), { statusCode: 404 });
  return { username: a.username, displayName: a.displayName || a.username, role: a.role || 'admin', createdAt: a.createdAt };
}

async function updateAdminProfile(username, { displayName }) {
  if (!displayName || !displayName.trim()) throw Object.assign(new Error('Display name is required.'), { statusCode: 400 });
  if (displayName.trim().length > 50) throw Object.assign(new Error('Display name must be 50 characters or less.'), { statusCode: 400 });
  const account = await refs.admin(username);
  await refs.setAdmin({ ...account, displayName: displayName.trim() });
  return { displayName: displayName.trim() };
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { bootstrapAdmin, login, verifyToken, changePassword, getAdminProfile, updateAdminProfile };
