import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import Redis from "ioredis";
@Injectable()
export class Cache implements OnModuleDestroy {
  private client?: Redis;
  constructor() {
    if (process.env.REDIS_URL) {
      this.client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this.client.on("error", () => {});
      void this.client.connect().catch(() => {});
    }
  }
  async read<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.client?.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch {}
    const result = await load();
    try {
      await this.client?.set(key, JSON.stringify(result), "EX", ttl);
    } catch {}
    return result;
  }
  async invalidate(projectId: string) {
    try {
      await this.client?.del(`stock:${projectId}`, `boq:${projectId}`);
    } catch {}
  }
  async limit(key: string, maximum: number, seconds: number) {
    if (!this.client)
      throw new ServiceUnavailableException("Login protection requires Redis");
    try {
      const count = Number(
        await this.client.eval(
          "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n",
          1,
          key,
          seconds,
        ),
      );
      return count <= maximum;
    } catch {
      throw new ServiceUnavailableException(
        "Login protection temporarily unavailable",
      );
    }
  }
  async ready() {
    if (!this.client || (await this.client.ping()) !== "PONG")
      throw new ServiceUnavailableException("Redis is unavailable");
  }
  async onModuleDestroy() {
    await this.client?.quit().catch(() => {});
  }
}
