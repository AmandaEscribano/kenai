import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const subscription = await request.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response('Invalid subscription', { status: 400 });
    }
    const key = createHash('sha256').update(subscription.endpoint).digest('hex');
    const store = getStore({ name: 'kenai-push-subscriptions', consistency: 'strong' });
    await store.set(key, JSON.stringify(subscription));
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Push registration failed', error);
    return new Response('Registration failed', { status: 500 });
  }
};
