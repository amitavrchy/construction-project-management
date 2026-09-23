import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'./e2e', timeout:60000, fullyParallel:false, workers:1, retries:0, use:{baseURL:process.env.E2E_URL || 'http://localhost:3000',headless:true,trace:'retain-on-failure'}, reporter:'list' });
