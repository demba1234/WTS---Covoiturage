import { buildNotifications } from './payload.mjs';

// deps : { webpush, getName(id), subsForClient(id), subsForConcierges(), removeSub(endpoint) }
// Envoie chaque notification à tous les appareils inscrits du destinataire. Ne lève jamais pour un appareil en échec.
export async function deliver(evt, deps) {
  const clientId = evt.record && (evt.record.client_id || evt.record.user_id);
  const name = clientId ? await deps.getName(clientId) : '';
  const jobs = buildNotifications(evt, name);
  const report = { sent: 0, removed: 0, failed: 0, notifications: jobs.length };
  for (const job of jobs) {
    const subs = job.to.concierges ? await deps.subsForConcierges() : await deps.subsForClient(job.to.client);
    const body = JSON.stringify(job.payload);
    await Promise.all(subs.map(async (s) => {
      try {
        await deps.webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 });
        report.sent++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) { await deps.removeSub(s.endpoint); report.removed++; }
        else report.failed++;
      }
    }));
  }
  return report;
}
