const { test, expect } = require('@playwright/test');

test.describe('Benthic Cashflow Fintoc Integration', () => {
  test('should load page, verify Fintoc SDK, and open Fintoc widget on click', async ({ page }) => {
    // 1. Visit local application
    await page.goto('http://localhost:3000');

    // 2. Assert page title matches Benthic Cashflow
    await expect(page).toHaveTitle(/Benthic Cashflow/i);

    // 3. Assert Fintoc.js CDN script is present in the DOM
    const scriptElement = page.locator('script[src*="js.fintoc.com"]');
    await expect(scriptElement).toBeAttached();

    // 4. Check if global Fintoc variable is defined in window
    const isFintocDefined = await page.evaluate(() => {
      return typeof window.Fintoc !== 'undefined';
    });
    
    console.log(`[TEST LOG] window.Fintoc is defined: ${isFintocDefined}`);
    expect(isFintocDefined).toBe(true);

    // 5. Connect button should be visible
    const connectBtn = page.locator('#connect-btn');
    await expect(connectBtn).toBeVisible();

    // 6. Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    // 7. Click Connect button
    console.log('[TEST LOG] Clicking Connect button...');
    await connectBtn.click();

    // 8. Wait for Fintoc Widget Iframe to load
    // The Fintoc Widget generates an iframe with id "fintoc-iframe-id" or similar
    console.log('[TEST LOG] Waiting for Fintoc iframe to appear...');
    const fintocIframe = page.locator('iframe[id="fintoc-iframe-id"]');
    
    // Give it up to 5 seconds to load the iframe (calling backend API and loading widget)
    await expect(fintocIframe).toBeVisible({ timeout: 10000 });
    
    const iframeSrc = await fintocIframe.getAttribute('src');
    console.log(`[TEST LOG] Fintoc Widget iframe loaded successfully. Src: ${iframeSrc}`);
    
    expect(iframeSrc).toContain('fintoc.com');
    expect(consoleErrors).toHaveLength(0);
  });
});
