import { Redis } from 'ioredis';
import { compareVersions } from 'compare-versions';
import cacheManager, { CacheClient, CacheManagerOptions, parseIfRequired } from '@type-cacheable/core';
import { IoRedisAdapter } from '@type-cacheable/ioredis-adapter';
import { createHash } from 'node:crypto';

export class ShardAdapter implements CacheClient {
  constructor(redisClients: Redis[]) {
    this.ioRedisAdapters = redisClients.map((client) => new IoRedisAdapter(client));

    this.get = this.get.bind(this);
    this.del = this.del.bind(this);
    this.delHash = this.delHash.bind(this);
    this.getClientTTL = this.getClientTTL.bind(this);
    this.keys = this.keys.bind(this);
    this.set = this.set.bind(this);
  }

  private readonly ioRedisAdapters: IoRedisAdapter[];

  private getShard(cacheKey: string): number {
    const buffer = createHash('sha256').update(cacheKey).digest();
    var hash = 0;
    var offset = 0;
    while (offset + 4 <= buffer.length) {
      hash = hash ^ buffer.readUint32LE();
      offset += 4;
    }

    return hash % this.ioRedisAdapters.length;
  }

  public async get(cacheKey: string): Promise<any> {
    const shard = this.getShard(cacheKey);
    return this.ioRedisAdapters[shard].get(cacheKey);
  }

  public async set(cacheKey: string, value: any, ttl?: number): Promise<any> {
    const shard = this.getShard(cacheKey);
    return this.ioRedisAdapters[shard].set(cacheKey, value, ttl);
  }

  public getClientTTL(): number {
    return 0;
  }

  // ['a', 'b', 'c'] 를 { 1: ['a', 'b'], 2: ['c'] } 의 형태로 정리
  // key: shard, value: 키 배열
  private organizeByShard(keyOrKeys: string | string[]): Map<number, string[]> {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const result: Map<number, string[]> = new Map();
    keys.forEach((key) => {
      const shard = this.getShard(key);
      const keysOfShard = result.get(shard);
      if (keysOfShard) {
        keysOfShard.push(key);
      } else {
        result.set(shard, [key]);
      }
    });
    console.log('organizeByShard', result);
    return result;
  }

  public async del(keyOrKeys: string | string[]): Promise<any> {
    if (Array.isArray(keyOrKeys) && !keyOrKeys.length) {
      return 0;
    }

    const keysToDelete = this.organizeByShard(keyOrKeys);
    const deletePromises = Array.from(keysToDelete).map(([shard, keys]) => this.ioRedisAdapters[shard].del(keys));
    await Promise.all(deletePromises);
  }

  public async keys(pattern: string): Promise<string[]> {
    const keysPromises = this.ioRedisAdapters.map((adapter) => adapter.keys(pattern));
    const keys = await Promise.all(keysPromises);
    return keys.flat();
  }

  public async delHash(hashKeyOrKeys: string | string[]): Promise<any> {
    const finalDeleteKeys = Array.isArray(hashKeyOrKeys) ? hashKeyOrKeys : [hashKeyOrKeys];
    const deletePromises = finalDeleteKeys.map((key) => this.keys(`*${key}*`).then(this.del));

    await Promise.all(deletePromises);
  }
}

export const useAdapter = (clients: Redis[], asFallback?: boolean, options?: CacheManagerOptions): ShardAdapter => {
  const shardAdapter = new ShardAdapter(clients);

  if (asFallback) {
    cacheManager.setFallbackClient(shardAdapter);
  } else {
    cacheManager.setClient(shardAdapter);
  }

  if (options) {
    cacheManager.setOptions(options);
  }

  return shardAdapter;
};
