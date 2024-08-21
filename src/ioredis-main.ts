import { Redis } from 'ioredis';
import { z } from 'zod';
import { createHash } from 'node:crypto';

const userSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  age: z.number(),
});

type UserSchema = z.infer<typeof userSchema>;

function getShard(redis: Redis[], key: string): number {
  const buffer = createHash('sha256').update(key).digest();
  var hash = 0;
  var offset = 0;
  while (offset + 4 <= buffer.length) {
    hash = hash ^ buffer.readUint32LE();
    offset += 4;
  }

  return hash % redis.length;
}

async function setUser(redis: Redis[], key: string, value: UserSchema) {
  const shard = getShard(redis, key);
  await redis[shard].set(key, JSON.stringify(value), 'EX', 3600);
}

async function getUser(redis: Redis[], key: string): Promise<UserSchema | null> {
  const shard = getShard(redis, key);
  const v = await redis[shard].get(key);
  if (!v) {
    return null;
  }
  // 안좋은 예: return JSON.parse(v) as UserSchema
  //   결과값이 UserShcema 타입이 맞을지 전혀 장담할 수 없다.
  // zod의 parse()를 사용하면, v 가 UserSchema object로 변환될 수 없는 json string일 때 에러 발생
  return userSchema.parse(JSON.parse(v));
}

async function main() {
  const redis = [new Redis(6379, '127.0.0.1'), new Redis(6380, '127.0.0.1')];

  await setUser(redis, 'chaeyk', { name: '채영구', age: 45 });
  const user = await getUser(redis, 'chaeyk');
  console.log('user', user);

  redis.forEach(v => v.disconnect()); 
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
