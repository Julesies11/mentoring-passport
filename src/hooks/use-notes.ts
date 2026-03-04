import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPairNotes,
  fetchUserNotes,
  fetchAllNotes,
  createNote,
  updateNote,
  deleteNote,
  type CreateNoteInput,
  type UpdateNoteInput,
} from '@/lib/api/notes';

export function usePairNotes(pairId: string) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', 'pair', pairId],
    queryFn: () => fetchPairNotes(pairId),
    enabled: !!pairId,
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: UpdateNoteInput }) =>
      updateNote(noteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  return {
    notes,
    isLoading,
    error,
    createNote: createMutation.mutateAsync,
    updateNote: (id: string, input: UpdateNoteInput) => updateMutation.mutateAsync({ noteId: id, input }),
    deleteNote: deleteMutation.mutateAsync,
  };
}

// Alias for unified usage
export const useNotes = usePairNotes;

export function useUserNotes(userId: string) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', 'user', userId],
    queryFn: () => fetchUserNotes(userId),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: UpdateNoteInput }) =>
      updateNote(noteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  return {
    notes,
    isLoading,
    error,
    createNote: createMutation,
    updateNote: updateMutation,
    deleteNote: deleteMutation,
  };
}

export function useAllNotes() {
  return useQuery({
    queryKey: ['notes', 'all'],
    queryFn: fetchAllNotes,
  });
}
