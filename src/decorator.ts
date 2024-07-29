import { Redis } from 'ioredis';
import cacheManager, { CacheManagerOptions, CacheUpdate, Cacheable } from '@type-cacheable/core';
import wait from 'waait';
import { useAdapter } from '@type-cacheable/ioredis-adapter';

class TokenManager {
  static tokenCacheKey = (args: any[]) => args[0];

  @CacheUpdate({ cacheKey: TokenManager.tokenCacheKey })
  async setToken(key: string, token: string) {
    console.log(`setToken('${key}', '${token}') invoked.`);
  }

  @Cacheable({ cacheKey: TokenManager.tokenCacheKey })
  async getToken(key: string): Promise<string | null> {
    console.log(`getToken('${key}') invoked.`);
    return '123456';
  }
}

async function main() {
  const redis = new Redis(6379, '127.0.0.1');
  useAdapter(redis);

  cacheManager.setOptions(<CacheManagerOptions>{
    ttlSeconds: 5,
  });

  const tokenManager = new TokenManager();

  console.log('1st getToken()');
  await tokenManager.getToken('chaeyk');

  console.log('2nd getToken()');
  await tokenManager.getToken('chaeyk');

  // set cache
  await tokenManager.setToken('chaeyk' ,'123456');

  console.log('3rd getToken()');
  await tokenManager.getToken('chaeyk');

  console.log('4th getToken()');
  await tokenManager.getToken('chaeyk');

  console.log('wait 5 seconds.');
  await wait(5000);
  await tokenManager.getToken('chaeyk');

  redis.disconnect();
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
