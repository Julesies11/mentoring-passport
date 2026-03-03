import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserNotes } from '@/hooks/use-notes';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';

export function MenteeNotesPage() {
  const { user } = useAuth();
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();
  const { notes = [], isLoading, createNote, updateNote, deleteNote } = useUserNotes(user?.id || '');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [formData, setFormData] = useState({
    pair_id: '',
    title: '',
    content: '',
    is_private: false
  });

  useEffect(() => {
    if (activePair && !formData.pair_id) {
      setFormData(prev => ({ ...prev, pair_id: activePair.id }));
    }
  }, [activePair, formData.pair_id]);

  const privateNotes = notes.filter(note => note.is_private);
  const sharedNotes = notes.filter(note => !note.is_private);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pair_id) {
      toast.error('Please select a mentoring relationship');
      return;
    }
    try {
      await createNote.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({ pair_id: '', title: '', content: '', is_private: false });
      toast.success('Note created successfully');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;
    try {
      await updateNote.mutateAsync({
        noteId: selectedNote.id,
        input: {
          title: formData.title,
          content: formData.content,
          is_private: formData.is_private
        }
      });
      setSelectedNote(null);
      setFormData({ pair_id: '', title: '', content: '', is_private: false });
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const handleEdit = (note: any) => {
    setSelectedNote(note);
    setFormData({
      pair_id: note.pair_id,
      title: note.title || '',
      content: note.content,
      is_private: note.is_private
    });
  };

  const handleDelete = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote.mutateAsync(noteId);
        toast.success('Note deleted successfully');
      } catch (error) {
        console.error('Error deleting note:', error);
        toast.error('Failed to delete note');
      }
    }
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Notes"
            description="Manage your mentoring notes and reflections"
          />
          <ToolbarActions>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <KeenIcon icon="plus" />
              New Note
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading notes...</p>
            </div>
          ) : (
            <>
              {/* Stats Section */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1 text-purple-600">Private Notes</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-purple-600">{privateNotes.length}</p>
                      <KeenIcon icon="eye-slash" className="text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1 text-success">Shared Notes</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-success">{sharedNotes.length}</p>
                      <KeenIcon icon="people" className="text-success" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes Grid */}
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-gray-900">All Notes</h3>
                {notes.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <KeenIcon icon="notepad" className="text-3xl text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Notes Yet</h3>
                      <p className="text-muted-foreground text-center max-w-sm mb-6">
                        Start documenting your mentoring journey with notes about meetings, goals, and personal reflections.
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <KeenIcon icon="plus" />
                        Create First Note
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7.5">
                    {notes.map((note) => (
                      <Card key={note.id} className="hover:shadow-md transition-shadow flex flex-col h-full relative">
                        <CardHeader className="pb-3 border-b border-gray-100 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <KeenIcon icon="notepad" className="text-primary" />
                              <CardTitle className="text-base font-bold text-gray-900 truncate max-w-[150px]">
                                {note.title || 'Untitled Note'}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-1">
                              {note.is_private ? (
                                <Badge className="bg-purple-500 text-white border-none text-[10px] h-5 px-1.5">
                                  <KeenIcon icon="eye-slash" className="text-[10px] mr-1" />
                                  Private
                                </Badge>
                              ) : (
                                <Badge className="bg-success text-white border-none text-[10px] h-5 px-1.5">
                                  <KeenIcon icon="people" className="text-[10px] mr-1" />
                                  Shared
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 flex-1 flex flex-col">
                          <p className="text-sm text-gray-600 mb-6 line-clamp-4 leading-relaxed flex-1 whitespace-pre-wrap">
                            {note.content}
                          </p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Mentor</span>
                              <span className="text-xs font-semibold text-gray-900">
                                {note.pair?.mentor?.full_name || 'Unknown'}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {format(new Date(note.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(note)}>
                              <KeenIcon icon="pencil" />
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" mode="icon" onClick={() => handleDelete(note.id)}>
                              <KeenIcon icon="trash" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Container>

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
            <DialogDescription>
              Add a new note to document your mentoring journey and reflections.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pair_id" className="text-gray-900 font-semibold">Mentoring Relationship *</Label>
              <Select
                value={formData.pair_id}
                onValueChange={(value) => setFormData({ ...formData, pair_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {pairs.map((pair) => (
                    <SelectItem key={pair.id} value={pair.id}>
                      {pair.mentor?.full_name} (Mentor)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-900 font-semibold">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Reflection on Skill Workshop"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="content" className="text-gray-900 font-semibold">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your thoughts, reflections, or meeting notes here..."
                rows={5}
                className="resize-none"
                required
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-col">
                <Label htmlFor="is_private" className="text-gray-900 font-semibold cursor-pointer">Private Note</Label>
                <span className="text-[10px] text-muted-foreground">Only visible to you</span>
              </div>
              <Switch
                id="is_private"
                checked={formData.is_private}
                onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
              />
            </div>
            
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update your note and reflections.
            </DialogDescription>
          </DialogHeader>
          {selectedNote && (
            <form onSubmit={handleUpdate} className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title" className="text-gray-900 font-semibold">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-content" className="text-gray-900 font-semibold">Content *</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  className="resize-none"
                  required
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <Label htmlFor="edit-is_private" className="text-gray-900 font-semibold cursor-pointer">Private Note</Label>
                  <span className="text-[10px] text-muted-foreground">Only visible to you</span>
                </div>
                <Switch
                  id="edit-is_private"
                  checked={formData.is_private}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
                />
              </div>
              
              <DialogFooter className="pt-4 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setSelectedNote(null)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Note
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
