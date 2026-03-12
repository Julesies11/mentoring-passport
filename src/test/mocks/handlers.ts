import { http, HttpResponse } from 'msw';

// Mock data
const mockEvidenceTypes = [
  { id: 'et1', name: 'Photo evidence', requires_submission: true },
  { id: 'et2', name: 'Not Applicable', requires_submission: false },
];

const mockProfiles = [
  { id: 'm1', full_name: 'Mentor One', email: 'm1@test.com', organisation_id: 'org1', status: 'active' },
  { id: 'me1', full_name: 'Mentee One', email: 'me1@test.com', organisation_id: 'org1', status: 'active' },
  { id: 'u1', full_name: 'Supervisor User', email: 'u1@test.com', organisation_id: 'org1', status: 'active' },
];

const mockMemberships = [
  { user_id: 'm1', organisation_id: 'org1', role: 'program-member', status: 'active' },
  { user_id: 'me1', organisation_id: 'org1', role: 'program-member', status: 'active' },
  { user_id: 'u1', organisation_id: 'org1', role: 'supervisor', status: 'active' },
];

const mockOrganisations = [
  { id: 'org1', name: 'Fiona Stanley Hospital', logo_url: null },
];

const mockPrograms = [
  { id: 'prog1', organisation_id: 'org1', name: 'General Program', status: 'active' },
];

const mockPairs = [
  { 
    id: 'p1', 
    mentor_id: 'm1', 
    mentee_id: 'me1',
    mentor: mockProfiles[0],
    mentee: mockProfiles[1],
    program_id: 'prog1',
    program: mockPrograms[0],
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
    // Add joined memberships to the profiles
    const profilesWithMemberships = mockProfiles.map(p => ({
      ...p,
      memberships: mockMemberships.filter(m => m.user_id === p.id)
    }));
    return HttpResponse.json(profilesWithMemberships);
  }),

  // Fetch Memberships
  http.get('*/rest/v1/mp_memberships*', ({ request }) => {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('user_id');
    if (userIdParam) {
      const userId = userIdParam.includes('.') ? userIdParam.split('.')[1] : userIdParam;
      const filtered = mockMemberships.filter(m => m.user_id === userId);
      return HttpResponse.json(filtered);
    }
    return HttpResponse.json(mockMemberships);
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

  // Fetch Organisations
  http.get('*/rest/v1/mp_organisations*', ({ request }) => {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    if (idParam) {
      const id = idParam.includes('.') ? idParam.split('.')[1] : idParam;
      const org = mockOrganisations.find(o => o.id === id);
      return HttpResponse.json(org ? [org] : []);
    }
    return HttpResponse.json(mockOrganisations);
  }),

  // Fetch Programs
  http.get('*/rest/v1/mp_programs*', ({ request }) => {
    const url = new URL(request.url);
    const orgIdParam = url.searchParams.get('organisation_id');
    if (orgIdParam) {
      const orgId = orgIdParam.includes('.') ? orgIdParam.split('.')[1] : orgIdParam;
      const filtered = mockPrograms.filter(p => p.organisation_id === orgId);
      return HttpResponse.json(filtered);
    }
    return HttpResponse.json(mockPrograms);
  }),
];
