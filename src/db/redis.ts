import { createClient } from 'redis';
const client = createClient();

(async () => {
  

  client.on('error', (err) => console.log('Redis Client Error', err));

  await client.connect();

  await client.set('key', 'value');
  const value = await client.get('key');
})();

export default client;