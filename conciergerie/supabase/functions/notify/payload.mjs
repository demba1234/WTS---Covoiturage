// Qui prévenir, et avec quel texte, quand quelque chose change. Fonction pure : aucune dépendance, testable seule.
const STATUS_BODY = ['Demande reçue', 'Abou s’en occupe', 'Une proposition vous attend', 'Demande confirmée'];

export function clip(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// evt : { table, type, record, old_record }   clientName : nom du client concerné
// retourne [{ to: { client: id } | { concierges: true }, payload: { title, body, url, tag } }]
export function buildNotifications(evt, clientName) {
  const out = [];
  const r = evt.record || {}, o = evt.old_record || null, name = clientName || 'Un client';

  if (evt.table === 'messages' && evt.type === 'INSERT') {
    if (r.sender === 'concierge') {
      out.push({ to: { client: r.client_id }, payload: {
        title: 'Abou', body: r.body ? clip(r.body, 120) : 'Abou vous propose des options',
        url: '/index.html#messages', tag: 'msg-' + r.client_id } });
    } else if (r.sender === 'client') {
      out.push({ to: { concierges: true }, payload: {
        title: name, body: clip(r.body, 120), url: '/concierge', tag: 'msg-' + r.client_id } });
    }
  }

  if (evt.table === 'requests' && evt.type === 'INSERT') {
    out.push({ to: { concierges: true }, payload: {
      title: 'Nouvelle demande', body: clip(r.title + ' · ' + name, 120), url: '/concierge', tag: 'req-' + r.id } });
  }

  if (evt.table === 'requests' && evt.type === 'UPDATE' && o && o.step !== r.step) {
    const validatedByClient = r.step === 3 && o.step === 2 && (r.notes || [])[2] === 'Validée par vous';
    if (validatedByClient) {
      out.push({ to: { concierges: true }, payload: {
        title: 'Proposition validée', body: clip(r.title + ' · ' + name, 120), url: '/concierge', tag: 'req-' + r.id } });
    } else {
      out.push({ to: { client: r.user_id }, payload: {
        title: 'Demande Nº ' + String(r.num).padStart(4, '0'),
        body: clip(STATUS_BODY[r.step] + ' · ' + r.title, 120), url: '/index.html#requests', tag: 'req-' + r.id } });
    }
  }
  return out;
}
