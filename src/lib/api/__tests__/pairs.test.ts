import { createPair } from '../pairs';
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock master data
const mockMasterTasks = [
  { id: 'mt1', name: 'Master Task 1', evidence_type_id: 'et1', sort_order: 1, is_active: true }
];

const mockMasterSubtasks = [
  { id: 'mst1', task_id: 'mt1', name: 'Master Subtask 1', evidence_type_id: 'et1', sort_order: 1 }
];

describe('Pairs API - createPair logic', () => {
  beforeEach(() => {
    // Reset handlers and add specific ones for this test
    server.use(
      // Mock mp_evidence_types check
      http.get('*/rest/v1/mp_evidence_types*', () => {
        return HttpResponse.json([{ id: 'et-na', name: 'Not Applicable' }]);
      }),

      // Mock mp_pairs insertion
      http.post('*/rest/v1/mp_pairs*', () => {
        return HttpResponse.json({ 
          id: 'new-pair-id', 
          mentor_id: 'm1', 
          mentee_id: 'me1',
          mentor: { full_name: 'M' },
          mentee: { full_name: 'Me' }
        });
      }),

      // Mock mp_tasks_master fetch
      http.get('*/rest/v1/mp_tasks_master*', () => {
        return HttpResponse.json(mockMasterTasks);
      }),

      // Mock mp_subtasks_master fetch
      http.get('*/rest/v1/mp_subtasks_master*', () => {
        return HttpResponse.json(mockMasterSubtasks);
      }),

      // Track insertions
      http.post('*/rest/v1/mp_pair_tasks*', async ({ request: _request }) => {
        const body = await _request.json();
        // Return first created task for the next step's .single() call
        return HttpResponse.json([{ id: 'pt-new-id', ...body[0] }]);
      }),

      // Handle the .single() fetch for created pair task
      http.get('*/rest/v1/mp_pair_tasks*', () => {
        return HttpResponse.json({ id: 'pt-new-id' });
      }),

      http.post('*/rest/v1/mp_pair_subtasks*', async () => {
        return HttpResponse.json([{ id: 'pst-new-id' }]);
      })
    );
  });

  it('orchestrates the creation of pair, tasks, and subtasks', async () => {
    // We'll use spies to verify the number of calls if we wanted, 
    // but MSW intercepting successfully is already a good sign.
    
    const pair = await createPair({ mentor_id: 'm1', mentee_id: 'me1' });
    
    expect(pair.id).toBe('new-pair-id');
    // If the function completes without throwing, the logic flow worked.
  });

  it('verifies that tasks are mapped correctly from master', async () => {
    let capturedPairTasks: any[] = [];
    
    server.use(
      http.post('*/rest/v1/mp_pair_tasks*', async ({ request: _request }) => {
        capturedPairTasks = await _request.json();
        return HttpResponse.json([{ id: 'pt-new-id', ...capturedPairTasks[0] }]);
      })
    );

    await createPair({ mentor_id: 'm1', mentee_id: 'me1' });

    expect(capturedPairTasks).toHaveLength(1);
    expect(capturedPairTasks[0]).toMatchObject({
      master_task_id: 'mt1',
      name: 'Master Task 1',
      pair_id: 'new-pair-id'
    });
  });

  it('verifies that subtasks are mapped correctly from master', async () => {
    let capturedSubtasks: any[] = [];
    
    server.use(
      http.post('*/rest/v1/mp_pair_subtasks*', async ({ request: _request }) => {
        capturedSubtasks = await _request.json();
        return HttpResponse.json([{ id: 'pst-new-id' }]);
      })
    );

    await createPair({ mentor_id: 'm1', mentee_id: 'me1' });

    expect(capturedSubtasks).toHaveLength(1);
    expect(capturedSubtasks[0]).toMatchObject({
      master_subtask_id: 'mst1',
      name: 'Master Subtask 1',
      pair_task_id: 'pt-new-id'
    });
  });
});
