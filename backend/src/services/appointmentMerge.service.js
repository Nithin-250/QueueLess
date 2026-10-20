/**
 * Appointment Merge Service (DynamoDB stub)
 *
 * NOTE: Full implementation requires migration from Firebase
 */

let mergeTimer = null;

function startAppointmentMerge() {
  if (mergeTimer) return;
  console.log('[appointmentMerge] Appointment merge started (stub - not functional with DynamoDB yet)');
}

function stopAppointmentMerge() {
  if (mergeTimer) {
    clearInterval(mergeTimer);
    mergeTimer = null;
    console.log('[appointmentMerge] Appointment merge stopped.');
  }
}

module.exports = { startAppointmentMerge, stopAppointmentMerge };
