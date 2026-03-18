import { fetchPendingEvidence } from '../evidence';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock getEvidenceUrl helper
vi.mock('../evidence', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getEvidenceUrl: vi.fn().mockImplementation((path) => Promise.resolve(`signed-${path}`))
  };
});

describe('Evidence API Single-Organisation Grouping', () => {
  beforeEach(() => {
    // Reset handlers
    server.use(
      http.get('*/rest/v1/mp_evidence_uploads*', () => {
        return HttpResponse.json([
          { 
            id: 'ev1', 
            pair_task_id: 'task1', 
            file_name: 'file1.jpg', 
            file_url: 'path1.jpg',
            status: 'pending',
            created_at: '2024-03-01T10:00:00Z',
            task: { id: 'task1', name: 'Task 1', evidence_notes: 'Reflection 1' }
          },
          { 
            id: 'ev2', 
            pair_task_id: 'task1', 
            file_name: 'file2.jpg', 
            file_url: 'path2.jpg',
            status: 'pending',
            created_at: '2024-03-01T10:01:00Z',
            task: { id: 'task1', name: 'Task 1', evidence_notes: 'Reflection 1' }
          },
          { 
            id: 'ev3', 
            pair_task_id: 'task2', 
            file_name: 'file3.jpg', 
            file_url: 'path3.jpg',
            status: 'pending',
            created_at: '2024-03-01T10:05:00Z',
            task: { id: 'task2', name: 'Task 2', evidence_notes: 'Reflection 2' }
          }
        ]);
      })
    );
  });

  it('groups multiple files for the same task into a single submission', async () => {
    const results = await fetchPendingEvidence();
    
    // Should have 2 unique tasks (task1 and task2)
    expect(results).toHaveLength(2);
    
    // Check task1 grouping
    const task1 = results.find(r => r.pair_task_id === 'task1');
    expect(task1).toBeDefined();
    expect(task1?.all_files).toHaveLength(2);
    
    // Check task2
    const task2 = results.find(r => r.pair_task_id === 'task2');
    expect(task2).toBeDefined();
    expect(task2?.all_files).toHaveLength(1);
  });

  it('includes task-level evidence_notes in the results', async () => {
    const results = await fetchPendingEvidence();
    
    const task1 = results.find(r => r.pair_task_id === 'task1');
    expect(task1?.task?.evidence_notes).toBe('Reflection 1');
  });
});
