import { fetchJobTitles, createJobTitle, updateJobTitle, deleteJobTitle } from '../job-titles';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Job Titles API', () => {
  const mockOrgId = 'org1';
  const mockJobTitles = [
    { id: 'jt1', organisation_id: mockOrgId, title: 'Registrar', created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' },
    { id: 'jt2', organisation_id: mockOrgId, title: 'Consultant', created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    server.use(
      http.get('*/rest/v1/mp_job_titles*', () => {
        return HttpResponse.json(mockJobTitles);
      }),
      http.post('*/rest/v1/mp_job_titles*', () => {
        return HttpResponse.json(
          { id: 'jt3', organisation_id: mockOrgId, title: 'New Title', created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' }
        );
      }),
      http.patch('*/rest/v1/mp_job_titles*', () => {
        return HttpResponse.json(
          { id: 'jt1', organisation_id: mockOrgId, title: 'Updated Title', created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:05:00Z' }
        );
      }),
      http.delete('*/rest/v1/mp_job_titles*', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  it('fetches job titles for an organisation', async () => {
    const titles = await fetchJobTitles(mockOrgId);
    expect(titles).toHaveLength(2);
    expect(titles[0].title).toBe('Registrar');
  });

  it('creates a new job title', async () => {
    const title = await createJobTitle(mockOrgId, 'New Title');
    expect(title).toBeDefined();
    expect(title.title).toBe('New Title');
  });

  it('updates a job title', async () => {
    const title = await updateJobTitle('jt1', 'Updated Title');
    expect(title).toBeDefined();
    expect(title.title).toBe('Updated Title');
  });

  it('deletes a job title', async () => {
    await expect(deleteJobTitle('jt1')).resolves.not.toThrow();
  });
});
