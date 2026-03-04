import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useNotes } from '@/hooks/use-notes';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';

export function ProgramMemberNotesPage() {
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();
  const { notes, isLoading, createNote, updateNote, deleteNote } = useNotes(activePair?.id || '');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePair) return;
    try {
      await createNote({
        ...formData,
        pair_id: activePair.id,
      });
      setIsCreateDialogOpen(false);
      setFormData({ title: '', content: '' });
      toast.success('Note created successfully');
    } catch (error) {
      toast.error('Failed to create note');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;
    try {
      await updateNote(selectedNote.id, formData);
      setIsEditDialogOpen(false);
      setSelectedNote(null);
      setFormData({ title: '', content: '' });
      toast.success('Note updated successfully');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(id);
        toast.success('Note deleted successfully');
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const openEditDialog = (note: any) => {
    setSelectedNote(note);
    setFormData({ title: note.title || '', content: note.content });
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Relationship Notes"
              description="Keep track of private thoughts and session reflections"
            />
            <ToolbarActions>
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePair}>
                <KeenIcon icon="plus" />
                New Note
              </Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0 mt-4">
        <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
          {!activePair ? (
             <Card className="border-0 sm:border shadow-none sm:shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <KeenIcon icon="notepad-edit" className="text-2xl text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Please select a mentoring relationship to view notes.</p>
                </CardContent>
             </Card>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading notes...</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-7.5">
              <div className="sm:hidden mb-2">
                 <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full h-12 rounded-xl font-bold gap-2">
                    <KeenIcon icon="plus" />
                    Create New Note
                  </Button>
              </div>

              {notes.length === 0 ? (
                <Card className="border-0 sm:border shadow-none sm:shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-16 rounded-full bg-primary-light/10 flex items-center justify-center mb-4 text-primary">
                      <KeenIcon icon="notepad-edit" className="text-3xl" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">No notes yet</h3>
                    <p className="text-xs text-gray-500 max-w-[250px]">
                      Use notes to record session summaries, goals, or private reflections.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                  {notes.map((note) => (
                    <Card key={note.id} className="hover:shadow-md transition-shadow border-0 sm:border shadow-none sm:shadow-sm">
                      <CardHeader className="pb-2 flex flex-row items-start justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-50 sm:border-transparent">
                        <div className="flex flex-col gap-1 min-w-0">
                          <CardTitle className="text-sm font-bold text-gray-900 truncate">
                            {note.title || 'Untitled Note'}
                          </CardTitle>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {format(new Date(note.created_at), 'PPP')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" mode="icon" className="size-8 rounded-full" onClick={() => openEditDialog(note)}>
                            <KeenIcon icon="pencil" />
                          </Button>
                          <Button variant="ghost" mode="icon" className="size-8 rounded-full text-gray-400 hover:text-danger" onClick={() => handleDelete(note.id)}>
                            <KeenIcon icon="trash" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Container>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
            <DialogDescription>
              Record thoughts or summaries for this mentoring relationship. Notes are private to you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-gray-500">Title</Label>
              <Input
                id="title"
                placeholder="Session Summary, Goal Setting, etc."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-gray-500">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your reflections here..."
                required
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="resize-none"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Note</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title" className="text-xs font-bold uppercase tracking-wider text-gray-500">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content" className="text-xs font-bold uppercase tracking-wider text-gray-500">Content *</Label>
              <Textarea
                id="edit-content"
                required
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="resize-none"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Note</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
