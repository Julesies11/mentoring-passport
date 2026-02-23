import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPairNotes,
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
      queryClient.invalidateQueries({ queryKey: ['notes', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'all'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: UpdateNoteInput }) =>
      updateNote(noteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'all'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'all'] });
    },
  });

  return {
    notes,
    isLoading,
    error,
    createNote: (input: CreateNoteInput) => createMutation.mutate(input),
    updateNote: (noteId: string, input: UpdateNoteInput) =>
      updateMutation.mutate({ noteId, input }),
    deleteNote: (noteId: string) => deleteMutation.mutate(noteId),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAllNotes() {
  return useQuery({
    queryKey: ['notes', 'all'],
    queryFn: fetchAllNotes,
  });
}

export function useNotes() {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', 'all'],
    queryFn: fetchAllNotes,
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'pair'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: UpdateNoteInput }) =>
      updateNote(noteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'pair'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'pair'] });
    },
  });

  return {
    fetchPairNotes,
    createNote: (input: CreateNoteInput) => createMutation.mutate(input),
    updateNote: (noteId: string, input: UpdateNoteInput) =>
      updateMutation.mutate({ noteId, input }),
    deleteNote: (noteId: string) => deleteMutation.mutate(noteId),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
