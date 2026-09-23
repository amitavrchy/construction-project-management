import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
@Injectable()
export class Cache implements OnModuleDestroy {
  private client?: Redis;
  constructor() {
    if(process.env.REDIS_URL){this.client=new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:1,lazyConnect:true,enableOfflineQueue:false});this.client.on('error',()=>{});void this.client.connect().catch(()=>{});}
  }
  async read<T>(key:string,ttl:number,load:()=>Promise<T>):Promise<T>{
    try{const cached=await this.client?.get(key);if(cached)return JSON.parse(cached) as T;}catch{}
    const result=await load();try{await this.client?.set(key,JSON.stringify(result),'EX',ttl);}catch{}return result;
  }
  async invalidate(projectId:string){try{await this.client?.del(`stock:${projectId}`,`boq:${projectId}`);}catch{}}
  async onModuleDestroy(){await this.client?.quit().catch(()=>{});}
}
