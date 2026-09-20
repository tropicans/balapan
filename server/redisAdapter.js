import { createAdapter } from '@socket.io/redis-adapter';

export async function setupRedisSocketAdapter(io) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('ℹ️ REDIS_URL tidak dikonfigurasi. Menggunakan in-memory Socket.IO adapter.');
    return { adapter: 'in-memory', connected: false };
  }

  try {
    const { default: Redis } = await import('ioredis');
    const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise((resolve, reject) => {
        pubClient.on('ready', resolve);
        pubClient.on('error', reject);
      }),
      new Promise((resolve, reject) => {
        subClient.on('ready', resolve);
        subClient.on('error', reject);
      })
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('⚡ Redis Socket.IO Adapter berhasil terhubung!');
    return { adapter: 'redis', connected: true, pubClient, subClient };
  } catch (err) {
    console.warn('⚠️ Gagal menghubungkan Redis Socket.IO adapter, mengaktifkan auto-fallback ke in-memory mode:', err.message);
    return { adapter: 'in-memory', connected: false, error: err.message };
  }
}
