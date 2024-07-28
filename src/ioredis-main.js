const { Cluster, Redis } = require('ioredis');


async function main() {
  const redis = new Redis(6379, '127.0.0.1');
  // const redis = new Cluster([{ host: '127.0.0.1', port: 6379 }]);

  await redis.set('hello', 'world', 'EX', 3);
  const value = await redis.get('hello');
  console.log(value);

  redis.disconnect();
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
