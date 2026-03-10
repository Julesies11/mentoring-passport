import { fetchPrograms, createProgram } from '../programs';
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Programs API', () => {
  beforeEach(() => {
    // Reset handlers
    server.use(
      http.get('*/rest/v1/mp_programs*', () => {
        return HttpResponse.json([
          { 
            id: 'prog1', 
            organisation_id: 'org1',
            name: 'General Program', 
            status: 'active',
            created_at: '2024-03-01T10:00:00Z',
            updated_at: '2024-03-01T10:00:00Z'
          }
        ]);
      }),
      http.post('*/rest/v1/mp_programs*', () => {
        return HttpResponse.json({ 
          id: 'prog2', 
          organisation_id: 'org1',
          name: 'New Program', 
          status: 'active',
          created_at: '2024-03-01T10:05:00Z',
          updated_at: '2024-03-01T10:05:00Z'
        });
      })
    );
  });

  it('fetches programs for an organisation', async () => {
    const programs = await fetchPrograms('org1');
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toBe('General Program');
  });

  it('creates a new program', async () => {
    const program = await createProgram({ organisation_id: 'org1', name: 'New Program' });
    expect(program).toBeDefined();
    expect(program.name).toBe('New Program');
  });
});
