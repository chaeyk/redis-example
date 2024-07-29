import { Redis } from 'ioredis';
import cacheManager, { CacheClear, CacheManagerOptions, Cacheable } from '@type-cacheable/core';
import { useAdapter } from '@type-cacheable/ioredis-adapter';

interface Token {
  token: string;
}

class TokenManager {
  static tokenCacheKey = (args: any[]) => `token:${args[0]}`;

  @CacheClear({ cacheKey: TokenManager.tokenCacheKey })
  async setToken(key: string, token: string) {
    console.log(`setToken('${key}', '${token}') invoked.`);
  }

  @Cacheable({ cacheKey: TokenManager.tokenCacheKey })
  async getToken(key: string): Promise<Token | null> {
    console.log(`getToken('${key}') invoked.`)
    return { token: 'abcdef' };
  }

  @CacheClear({ cacheKey: TokenManager.tokenCacheKey })
  async clearToken(key: string) {}
}

async function main() {
  const redis = new Redis(6379, '127.0.0.1');
  useAdapter(redis);

  cacheManager.setOptions(<CacheManagerOptions>{
    ttlSeconds: 5,
    debug: true,
  });

  const tokenManager = new TokenManager();

  // 레디스 저장
  await tokenManager.setToken('chaeyk' ,'123456');

  // getToken()이 호출되고 레디스에 저장된다.
  console.log('cached token:', await tokenManager.getToken('chaeyk'));

  // 레디스에 저장된 값이 리턴된다.
  console.log('token:', await tokenManager.getToken('chaeyk'));

  redis.disconnect();
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
