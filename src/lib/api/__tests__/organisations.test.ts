import { fetchOrganisation, updateOrganisation } from '../organisations';
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Organisations API', () => {
  beforeEach(() => {
    // Reset handlers
    server.use(
      http.get('*/rest/v1/mp_organisations*', () => {
        return HttpResponse.json(
          { 
            id: 'org1', 
            name: 'Fiona Stanley Hospital', 
            logo_url: 'logo.jpg',
            created_at: '2024-03-01T10:00:00Z',
            updated_at: '2024-03-01T10:00:00Z'
          }
        );
      }),
      http.patch('*/rest/v1/mp_organisations*', () => {
        return HttpResponse.json({ 
          id: 'org1', 
          name: 'New Name', 
          logo_url: 'logo.jpg',
          created_at: '2024-03-01T10:00:00Z',
          updated_at: '2024-03-01T10:05:00Z'
        });
      })
    );
  });

  it('fetches an organisation by ID', async () => {
    const org = await fetchOrganisation('org1');
    expect(org).toBeDefined();
    expect(org?.id).toBe('org1');
    expect(org?.name).toBe('Fiona Stanley Hospital');
  });

  it('updates an organisation', async () => {
    const org = await updateOrganisation('org1', { name: 'New Name' });
    expect(org).toBeDefined();
    expect(org?.name).toBe('New Name');
  });
});
