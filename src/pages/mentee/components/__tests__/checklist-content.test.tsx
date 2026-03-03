import { render, screen, waitFor } from '@/test/utils';
import { ChecklistContent } from '../checklist-content';
import { describe, it, expect, vi } from 'vitest';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('ChecklistContent (Mentee View)', () => {
  it('renders "No Active Pairing" message when no pairs exist', async () => {
    // Override MSW for this specific test to return empty pairs
    const { server } = await import('@/test/mocks/server');
    const { http, HttpResponse } = await import('msw');
    
    server.use(
      http.get('*/rest/v1/mp_pairs*', () => {
        return HttpResponse.json([]);
      })
    );

    render(<ChecklistContent />, { 
      authValue: { role: 'mentee' as any, profileId: 'me1', isSupervisor: false, isMentee: true } 
    });

    await waitFor(() => {
      expect(screen.getByText(/No Active Pairing/)).toBeInTheDocument();
    });
  });

  it('renders mentoring tasks when active pair exists', async () => {
    render(<ChecklistContent />, { 
      authValue: { role: 'mentee' as any, profileId: 'me1', isSupervisor: false, isMentee: true } 
    });

    await waitFor(() => {
      // Use getAllByText because it appears in both Desktop and Mobile views
      const elements = screen.getAllByText('Initial Meeting');
      expect(elements.length).toBeGreaterThan(0);
    });
    
    expect(screen.getByText('My Journey Progress')).toBeInTheDocument();
  });
});
