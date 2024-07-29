import { Redis } from 'ioredis';
import cacheManager, { CacheClear, CacheManagerOptions, CacheUpdate, Cacheable } from '@type-cacheable/core';
import { useAdapter } from '@type-cacheable/ioredis-adapter';

interface Token {
  token: string;
}

class TokenManager {
  static tokenCacheKey = (args: any[]) => `token:${args[0]}`;

  @CacheUpdate({ cacheKey: TokenManager.tokenCacheKey })
  async setToken(key: string, token: string): Promise<Token> {
    console.log(`setToken('${key}', '${token}') invoked.`);
    return { token }; // return 값이 cache에 저장된다.
  }

  @Cacheable({ cacheKey: TokenManager.tokenCacheKey })
  async getToken(key: string): Promise<Token | null> {
    throw new Error(`${key} does not exists.`)
  }

  @CacheClear({ cacheKey: TokenManager.tokenCacheKey })
  async deleteToken(key: string) {}
}

async function main() {
  const redis = new Redis(6379, '127.0.0.1');
  useAdapter(redis);

  cacheManager.setOptions(<CacheManagerOptions>{
    ttlSeconds: 10,
  });

  const tokenManager = new TokenManager();

  // 레디스 저장
  await tokenManager.setToken('chaeyk' ,'123456');

  // getToken()은 호출되지 않고 레디스에 있던 값이 나온다.
  console.log('cached token:', await tokenManager.getToken('chaeyk'));

  // 레디스 삭제
  await tokenManager.deleteToken('chaeyk');

  redis.disconnect();
}

main()
  .then(() => console.log('Done'))
  .catch((reason) => console.error(`Failed: ${reason}`));
