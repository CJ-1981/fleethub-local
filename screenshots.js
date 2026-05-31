/**
 * FleetHub Screenshot Generator
 * Requires: npm install puppeteer
 * Run: node screenshots.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const screenshots = [
  { name: 'dashboard', title: 'Dashboard' },
  { name: 'bookings', title: 'Bookings' },
  { name: 'vehicles', title: 'Vehicles' },
  { name: 'calendar', title: 'Calendar' },
  { name: 'settings', title: 'Settings' }
];

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    const indexPath = path.join(__dirname, 'index.html');
    const fileUrl = pathToFileURL(indexPath).href;

    console.log('Opening FleetHub in demo mode...');

    // Navigate to the app
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Wait for demo mode to load
    await page.waitForSelector('#landing', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    // Click Demo Mode button
    await page.click('button[onclick="startDemo()"]');
    await page.waitForSelector('.main-content', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    // Capture each tab
    for (const shot of screenshots) {
      console.log(`Capturing ${shot.name}...`);

      // Click on the tab
      const clicked = await page.evaluate((tabName) => {
        const tab = [...document.querySelectorAll('.sidebar-nav-item, .mobile-nav-item')]
          .find(el => el.textContent.toLowerCase().includes(tabName.toLowerCase()));
        if (!tab) return false;
        tab.click();
        return true;
      }, shot.name);

      if (!clicked) {
        console.warn(`Tab not found: ${shot.name}, skipping screenshot`);
        continue;
      }

      // Wait for content to load
      await new Promise(r => setTimeout(r, 800));

      // Find the main content area and take screenshot
      const mainContent = await page.$('.main-content');
      if (mainContent) {
        await mainContent.screenshot({
          path: path.join(screenshotsDir, `${shot.name}.png`),
          omitBackground: false
        });
      }
    }

    console.log('Screenshots saved to ./screenshots/');
    console.log('Update README.md with these images.');
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
