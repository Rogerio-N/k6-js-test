import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export async function generateUserDelay(page, maxThinkingTimeInMs = 1000) {
    await page.waitForTimeout(randomIntBetween(300, maxThinkingTimeInMs))
}