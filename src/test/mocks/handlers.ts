import { http, HttpResponse } from 'msw';

// Mock data
const mockEvidenceTypes = [
  { id: 'et1', name: 'Photo evidence', requires_submission: true },
  { id: 'et2', name: 'Not Applicable', requires_submission: false },
];

const mockProfiles = [
  { id: 'm1', full_name: 'Mentor One', role: 'mentor' },
  { id: 'me1', full_name: 'Mentee One', role: 'mentee' },
  { id: 'u1', full_name: 'Supervisor User', role: 'supervisor' },
];

const mockPairs = [
  { 
    id: 'p1', 
    mentor_id: 'm1', 
    mentee_id: 'me1',
    mentor: mockProfiles[0],
    mentee: mockProfiles[1],
    status: 'active'
  },
];

const mockPairTasks = [
  {
    id: 'pt1',
    pair_id: 'p1',
    name: 'Initial Meeting',
    status: 'not_submitted',
    sort_order: 1,
    evidence_type_id: 'et1',
    master_task_id: 'mt1'
  }
];

export const handlers = [
  // Fetch Evidence Types
  http.get('*/rest/v1/mp_evidence_types*', () => {
    return HttpResponse.json(mockEvidenceTypes);
  }),

  // Fetch Pairs
  http.get('*/rest/v1/mp_pairs*', () => {
    return HttpResponse.json(mockPairs);
  }),

  // Fetch Profiles
  http.get('*/rest/v1/mp_profiles*', () => {
    return HttpResponse.json(mockProfiles);
  }),

  // Fetch Pair Tasks
  http.get('*/rest/v1/mp_pair_tasks*', ({ request }) => {
    const url = new URL(request.url);
    const pairIdParam = url.searchParams.get('pair_id');
    
    if (pairIdParam) {
      // Handle both formats: "p1" or "eq.p1"
      const pairId = pairIdParam.includes('.') ? pairIdParam.split('.')[1] : pairIdParam;
      const filtered = mockPairTasks.filter(t => t.pair_id === pairId);
      return HttpResponse.json(filtered);
    }
    
    return HttpResponse.json(mockPairTasks);
  }),

  // Update Pair Task Status
  http.patch('*/rest/v1/mp_pair_tasks*', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockPairTasks[0], ...body });
  }),

  // Create Pair Task
  http.post('*/rest/v1/mp_pair_tasks*', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-id', ...body });
  }),

  // Delete Pair Task
  http.delete('*/rest/v1/mp_pair_tasks*', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Fetch Meetings
  http.get('*/rest/v1/mp_meetings*', () => {
    return HttpResponse.json([]);
  }),

  // Fetch Evidence
  http.get('*/rest/v1/mp_evidence_uploads*', () => {
    return HttpResponse.json([]);
  }),

  // Fetch Subtasks
  http.get('*/rest/v1/mp_pair_subtasks*', () => {
    return HttpResponse.json([]);
  }),
];
