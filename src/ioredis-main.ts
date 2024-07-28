import { Redis } from 'ioredis';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  age: z.number(),
});

type UserSchema = z.infer<typeof userSchema>;

async function setUser(redis: Redis, key: string, value: UserSchema) {
  await redis.set(key, JSON.stringify(value), 'EX', 3600);
}

async function getUser(redis: Redis, key: string): Promise<UserSchema | null> {
  const v = await redis.get(key);
  if (!v) {
    return null;
  }
  // 안좋은 예: return JSON.parse(v) as UserSchema
  //   결과값이 UserShcema 타입이 맞을지 전혀 장담할 수 없다.
  // zod의 parse()를 사용하면, v 가 UserSchema object로 변환될 수 없는 json string일 때 에러 발생
  return userSchema.parse(JSON.parse(v));
}

async function main() {
  const redis = new Redis(6379, '127.0.0.1');

  await setUser(redis, 'chaeyk', { name: '채영구', age: 45 });
  const user = await getUser(redis, 'chaeyk');
  console.log('user', user);

  redis.disconnect();
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
