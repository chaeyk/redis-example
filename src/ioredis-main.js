const { Redis } = require('ioredis');
const { createHash } = require('crypto');

function getShard(redis, key) {
  const buffer = createHash('sha256').update(key).digest();
  var hash = 0;
  var offset = 0;
  while (offset + 4 <= buffer.length) {
    hash = hash ^ buffer.readUint32LE();
    offset += 4;
  }

  return hash % redis.length;
}

async function setUser(redis, key, value) {
  const shard = getShard(redis, key);
  await redis[shard].set(key, JSON.stringify(value), 'EX', 3600);
}

async function getUser(redis, key) {
  const shard = getShard(redis, key);
  const v = await redis[shard].get(key);
  if (!v) {
    return null;
  }
  return JSON.parse(v);
}

async function main() {
  var redis = [new Redis(6379, '127.0.0.1'), new Redis(6380, '127.0.0.1')];

  await setUser(redis, 'chaeyk', { name: '채영구', age: 45 });
  const user = await getUser(redis, 'chaeyk');
  console.log('user', user);

  redis.forEach(v => v.disconnect()); 
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
