/**
 * Scheduler Service (DynamoDB stub)
 *
 * NOTE: Full implementation requires migration from Firebase
 */

let schedulerTimer = null;

function startScheduler() {
  if (schedulerTimer) return;
  console.log('[scheduler] Scheduler started (stub - not functional with DynamoDB yet)');
}

function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[scheduler] Scheduler stopped.');
  }
}

module.exports = { startScheduler, stopScheduler };
