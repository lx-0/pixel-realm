import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    env: {
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379",
      DATABASE_URL: "postgresql://pixelrealm:pixelrealm_dev@localhost:5432/pixelrealm",
      JWT_SECRET: "test-secret-for-vitest",
    },
  },
});
