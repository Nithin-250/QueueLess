const { refs } = require('../config/dynamodb');
const analytics = require('./analytics.service');

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
let sweepTimer = null;

async function sweepExpiredTokens() {
  try {
    const all = await refs.tokens();
    const now = Date.now();
    let count = 0;

    for (const token of all) {
      // Referred patients are physically in the building (transferred between
      // counters) — never auto-expire them, even if their clock lapses.
      if (token.referred === true) continue;
      if (token.status === 'waiting' && token.expiresAt && token.expiresAt < now) {
        await refs.updateToken(token.id, { status: 'expired', expiredAt: now });
        count++;
      }
    }

    if (count > 0) {
      console.log(`[expiry] Marked ${count} token(s) as expired.`);

      // Log one analytics event per expired token
      for (const token of all) {
        if (token.status === 'waiting' && token.expiresAt && token.expiresAt < now && token.referred !== true) {
          analytics.logEvent({
            event_type: 'token_expired',
            token_id: token.id,
            token_number: token.number,
            service: token.service,
            timestamp: now,
          }).catch(() => {});
          analytics.upsertTokenRecord({ ...token, status: 'expired', expiredAt: now }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[expiry] Sweep error:', err.message);
  }
}

function startExpirySweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(sweepExpiredTokens, SWEEP_INTERVAL_MS);
  console.log('[expiry] Expiry sweep started (every 5 minutes).');
}

function stopExpirySweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
    console.log('[expiry] Expiry sweep stopped.');
  }
}

module.exports = { startExpirySweep, stopExpirySweep, sweepExpiredTokens };
