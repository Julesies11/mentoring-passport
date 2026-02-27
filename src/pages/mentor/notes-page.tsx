import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { usePairNotes } from '@/hooks/use-notes';
import { useUserPairs } from '@/hooks/use-pairs';
import { createNote, updateNote, deleteNote } from '@/lib/api/notes';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function MentorNotesPage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  
  // Get the active pair
  const activePair = pairs.find(p => p.status === 'active');
  const { notes = [], isLoading } = usePairNotes(activePair?.id || '');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [formData, setFormData] = useState({
    pair_id: activePair?.id || '',
    title: '',
    content: '',
    is_private: false
  });

  // Filter notes for mentor's pairs
  const mentorNotes = notes.filter(note => 
    pairs.some(pair => pair.id === note.pair_id)
  );

  const handleCreateNote = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      await createNote(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        pair_id: activePair?.id || '',
        title: '',
        content: '',
        is_private: false
      });
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleUpdateNote = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedNote) return;
    try {
      await updateNote(selectedNote.id, {
        title: selectedNote.title,
        content: selectedNote.content,
        is_private: selectedNote.is_private
      });
      setSelectedNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(noteId);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Notes"
            description="Keep track of your mentoring sessions and reflections"
          />
          <ToolbarActions>
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePair}>
              <KeenIcon icon="plus" />
              Add Note
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
          ) : !activePair ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="information-2" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Pairing</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  You don't have an active mentoring relationship at the moment. Notes are linked to mentoring pairs.
                </p>
              </CardContent>
            </Card>
          ) : mentorNotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="messages" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Notes Yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  Start documenting your mentoring journey. Capture reflections, goals, and session outcomes.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <KeenIcon icon="plus" />
                  Add Your First Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7.5">
              {mentorNotes.map((note) => (
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
                    <p className="text-sm text-gray-600 mb-6 line-clamp-4 leading-relaxed flex-1">
                      {note.content}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Mentee</span>
                        <span className="text-xs font-semibold text-gray-900">
                          {note.pair?.mentee?.full_name || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {format(new Date(note.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button size="xs" variant="outline" className="flex-1" onClick={() => setSelectedNote(note)}>
                        <KeenIcon icon="pencil" />
                        Edit
                      </Button>
                      <Button size="xs" variant="ghost" mode="icon" onClick={() => handleDeleteNote(note.id)}>
                        <KeenIcon icon="trash" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
            <DialogDescription>
              Add a note or reflection about your mentoring progress.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pair" className="text-gray-900 font-semibold">Mentee *</Label>
              <Select value={formData.pair_id} onValueChange={(value) => setFormData({...formData, pair_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mentee" />
                </SelectTrigger>
                <SelectContent>
                  {pairs.map((pair) => (
                    <SelectItem key={pair.id} value={pair.id}>
                      {pair.mentee?.full_name || 'Unknown'}
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
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Discussion on Career Goals"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="content" className="text-gray-900 font-semibold">Note Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Capture your thoughts and outcomes..."
                rows={6}
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
                onCheckedChange={(checked) => setFormData({...formData, is_private: checked})}
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
            <form onSubmit={handleUpdateNote} className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title" className="text-gray-900 font-semibold">Title *</Label>
                <Input
                  id="edit-title"
                  value={selectedNote.title}
                  onChange={(e) => setSelectedNote({...selectedNote, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-content" className="text-gray-900 font-semibold">Note Content *</Label>
                <Textarea
                  id="edit-content"
                  value={selectedNote.content}
                  onChange={(e) => setSelectedNote({...selectedNote, content: e.target.value})}
                  rows={6}
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
                  checked={selectedNote.is_private}
                  onCheckedChange={(checked) => setSelectedNote({...selectedNote, is_private: checked})}
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
    </Fragment>
  );
}

