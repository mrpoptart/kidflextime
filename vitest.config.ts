import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // The app's week maths runs on the family's local clock, so the tests
        // pin a timezone that actually observes DST rather than the CI box's UTC.
        env: { TZ: 'America/Los_Angeles' }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
