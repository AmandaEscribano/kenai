import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

const START_DATE = '2026-09-16';
const DOSES = {
  '08:00': [
    { name: 'Doxiciclina', days: 30 },
    { name: 'Kualcohepat', days: 30 },
    { name: 'Etisona', days: 10 }
  ],
  '20:00': [
    { name: 'Doxiciclina', days: 30 },
    { name: 'Etisona', days: 10 }
  ]
};

function argentinaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function activeOn(med, date) {
  const start = new Date(`${START_DATE}T12:00:00Z`);
  const current = new Date(`${date}T12:00:00Z`);
  const treatmentDay = Math.round((current - start) / 86400000);
  return treatmentDay >= 0 && treatmentDay < med.days;
}

export default async () => {
  const publicKey = Netlify.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Netlify.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) throw new Error('Missing VAPID environment variables');
  webpush.setVapidDetails('https://snazzy-kleicha-482df2.netlify.app/', publicKey, privateKey);

  const parts = argentinaParts();
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const doseTime = parts.hour === '07' ? '08:00' : '20:00';
  const medicines = (DOSES[doseTime] || []).filter(med => activeOn(med, date));
  if (!medicines.length) return;

  const store = getStore({ name: 'kenai-push-subscriptions', consistency: 'strong' });
  const { blobs } = await store.list();
  const payload = JSON.stringify({
    title: '🐶 Kenai',
    body: `En una hora toca ${medicines.map(m => m.name).join(' y ')}.`,
    url: 'https://snazzy-kleicha-482df2.netlify.app/'
  });

  await Promise.all(blobs.map(async ({ key }) => {
    const subscription = await store.get(key, { type: 'json' });
    if (!subscription) return;
    try {
      await webpush.sendNotification(subscription, payload);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await store.delete(key);
      else console.error('Push delivery failed', { key, statusCode: error.statusCode });
    }
  }));
};

export const config = { schedule: '0 10,22 * * *' };
