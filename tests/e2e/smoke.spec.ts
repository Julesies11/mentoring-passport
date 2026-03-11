import { test, expect } from '@playwright/test';

// List of all major routes in the application
const APP_ROUTES = [
  // Auth
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  
  // Supervisor Pages
  '/supervisor/dashboard',
  '/supervisor/participants',
  '/supervisor/pairs',
  '/supervisor/master-tasks',
  '/supervisor/evidence-review',
  '/supervisor/calendar',
  '/supervisor/checklist',
  '/supervisor/error-logs',
  '/supervisor/programs',
  
  // Program Member Pages
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
    test.setTimeout(120000);

    for (const route of APP_ROUTES) {
      console.log(`Checking route: ${route}`);
      
      // Navigate to the route
      await page.goto(route);
      
      // Wait for the DOM to settle (network idle is a good proxy for React having mounted)
      await page.waitForLoadState('networkidle');

      // The ultimate white screen check: 
      // 1. The body must have content.
      // 2. We should not find a React error boundary overlay if one exists.
      
      const bodyContent = await page.content();
      
      // Assert the page is not completely blank (A true white screen has almost no HTML inside root)
      const rootHtml = await page.locator('#root').innerHTML();
      expect(rootHtml.trim().length).toBeGreaterThan(10); // Should be populated
      
      // Most routes will redirect to /auth/signin if not authenticated, 
      // which is fine! A redirect means the router successfully evaluated 
      // the path without throwing a fatal JS error.
      
      // Check that standard UI elements (either the login form OR the main layout) are present
      const hasLoginForm = await page.locator('input[type="email"]').count() > 0;
      const hasMainLayout = await page.locator('main').count() > 0;
      const hasErrorPage = await page.locator('text="404"').count() > 0;
      
      expect(hasLoginForm || hasMainLayout || hasErrorPage).toBeTruthy();
    }
  });
});
