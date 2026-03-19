import { test, expect } from '@playwright/test';

// List of all major routes in the application
const APP_ROUTES = [
  // Auth
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  
  // System Administrator (Sys Admin)
  '/sys-admin/dashboard',
  '/sys-admin/settings',
  
  // Organisation Administrator (Org Admin)
  '/admin/dashboard',
  '/admin/programs',
  '/admin/participants',
  '/admin/task-templates',
  
  // Supervisor
  '/supervisor/hub',
  '/supervisor/dashboard',
  '/supervisor/participants',
  '/supervisor/pairs',
  '/supervisor/program-tasks',
  '/supervisor/evidence-review',
  '/supervisor/calendar',
  '/supervisor/checklist',
  '/supervisor/error-logs',
  
  // Program Member
  '/program-member/dashboard',
  '/program-member/tasks',
  '/program-member/mentees',
  '/program-member/mentor',
  '/program-member/meetings',
  
  // Shared
  '/profile/edit',
];

test.describe('Exhaustive E2E Smoke Test (White Screen Prevention)', () => {
  
  test('App should not render a white screen on any known route', async ({ page }) => {
    // Increase timeout for exhaustive crawling
    test.setTimeout(300000);

    for (const route of APP_ROUTES) {
      console.log(`Checking route: ${route}`);
      
      // Capture console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Navigate to the route
      await page.goto(route);
      
      // Wait for the DOM to settle and React to mount
      try {
        await page.waitForSelector('#root > *', { timeout: 10000 });
        // Ensure screen loader is gone
        await page.waitForSelector('[data-slot="screen-loader"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
      } catch (_e) {
        // If it's a redirect to a page with a different structure, we might not see a direct child of #root immediately
      }
      
      await page.waitForLoadState('networkidle');

      // The ultimate white screen check: 
      // 1. The body must have content.
      // 2. We should not find a React error boundary overlay if one exists.
      
      // Assert the page is not completely blank
      const rootHtml = await page.locator('#root').innerHTML();
      
      if (rootHtml.trim().length <= 10) {
        console.error(`FAILURE on route ${route}: root was empty.`);
        console.error('Console Errors:', consoleErrors);
        console.error('HTML snippet:', (await page.content()).substring(0, 500));
      }

      expect(rootHtml.trim().length).toBeGreaterThan(10);
      
      // Most routes will redirect to /auth/signin if not authenticated, 
      // which is fine! A redirect means the router successfully evaluated 
      // the path without throwing a fatal JS error.
      
      // Check that standard UI elements (either the login form OR the main layout) are present
      const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
      const hasMainLayout = await page.locator('main').count() > 0;
      const hasErrorPage = await page.getByText('404 Error').count() > 0;
      
      expect(hasLoginForm || hasMainLayout || hasErrorPage).toBeTruthy();
    }
  });
});
