import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface JobTitle {
  id: string;
  organisation_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all job titles for an organisation
 */
export async function fetchJobTitles(orgId: string): Promise<JobTitle[]> {
  const { data, error } = await supabase
    .from('mp_job_titles')
    .select('*')
    .eq('organisation_id', orgId)
    .order('title', { ascending: true });

  if (error) {
    await logError({
      message: `Failed to fetch job titles: ${error.message}`,
      componentName: 'job-titles-api',
      metadata: { orgId }
    });
    throw error;
  }

  return data || [];
}

/**
 * Create a new job title
 */
export async function createJobTitle(orgId: string, title: string): Promise<JobTitle> {
  const { data, error } = await supabase
    .from('mp_job_titles')
    .insert([{ organisation_id: orgId, title, is_active: true }])
    .select()
    .single();

  if (error) {
    await logError({
      message: `Failed to create job title: ${error.message}`,
      componentName: 'job-titles-api',
      metadata: { orgId, title }
    });
    throw error;
  }

  return data;
}

/**
 * Update an existing job title
 */
export async function updateJobTitle(id: string, title: string): Promise<JobTitle> {
  const { data, error } = await supabase
    .from('mp_job_titles')
    .update({ 
      title,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await logError({
      message: `Failed to update job title: ${error.message}`,
      componentName: 'job-titles-api',
      metadata: { id, title }
    });
    throw error;
  }

  return data;
}

/**
 * Toggle job title active status
 */
export async function toggleJobTitleStatus(id: string, isActive: boolean): Promise<JobTitle> {
  const { data, error } = await supabase
    .from('mp_job_titles')
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await logError({
      message: `Failed to toggle job title status: ${error.message}`,
      componentName: 'job-titles-api',
      metadata: { id, isActive }
    });
    throw error;
  }

  return data;
}

/**
 * Delete a job title (kept for internal consistency, but preference is toggle)
 */
export async function deleteJobTitle(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_job_titles')
    .delete()
    .eq('id', id);

  if (error) {
    await logError({
      message: `Failed to delete job title: ${error.message}`,
      componentName: 'job-titles-api',
      metadata: { id }
    });
    throw error;
  }
}
