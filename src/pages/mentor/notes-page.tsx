import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useNotes } from '@/hooks/use-notes';
import { useUserPairs } from '@/hooks/use-pairs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Edit, Trash2, Eye, EyeOff, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export function MentorNotesPage() {
  const { user } = useAuth();
  const { fetchPairNotes, createNote, updateNote, deleteNote } = useNotes();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { data: notes = [], isLoading } = fetchPairNotes();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [formData, setFormData] = useState({
    pair_id: '',
    title: '',
    content: '',
    is_private: false
  });

  // Filter notes for mentor's pairs
  const mentorNotes = notes.filter(note => 
    pairs.some(pair => pair.id === note.pair_id)
  );

  const handleCreateNote = async () => {
    try {
      await createNote(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        pair_id: '',
        title: '',
        content: '',
        is_private: false
      });
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, updates: any) => {
    try {
      await updateNote(noteId, updates);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container-fixed">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
            <p className="text-sm text-gray-600">Loading notes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
          <p className="text-sm text-gray-600">
            Keep track of your mentoring sessions and reflections
          </p>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50">
              {mentorNotes.filter(n => !n.is_private).length} Public
            </Badge>
            <Badge variant="outline" className="bg-purple-50">
              {mentorNotes.filter(n => n.is_private).length} Private
            </Badge>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Add a note about one of your mentees
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pair">Mentee</Label>
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
                
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Note title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Your notes and reflections..."
                    rows={6}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_private"
                    checked={formData.is_private}
                    onChange={(e) => setFormData({...formData, is_private: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_private" className="text-sm">
                    Make this note private (only visible to you)
                  </Label>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCreateNote} className="flex-1">
                    Create Note
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {mentorNotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Notes Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start documenting your mentoring journey.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Note
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {mentorNotes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {note.pair?.mentee?.full_name || 'Unknown Mentee'}
                          <Calendar className="h-4 w-4 ml-2" />
                          {format(new Date(note.created_at), 'PPP')}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.is_private && (
                        <Badge variant="outline" className="bg-purple-50">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-gray-50">
                        {note.author?.full_name || user?.full_name || 'You'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedNote(note)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteNote(note.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Note Dialog */}
        <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update your note for {selectedNote?.pair?.mentee?.full_name}
              </DialogDescription>
            </DialogHeader>
            {selectedNote && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={selectedNote.title}
                    onChange={(e) => setSelectedNote({...selectedNote, title: e.target.value})}
                    placeholder="Note title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-content">Content</Label>
                  <Textarea
                    id="edit-content"
                    value={selectedNote.content}
                    onChange={(e) => setSelectedNote({...selectedNote, content: e.target.value})}
                    placeholder="Your notes and reflections..."
                    rows={6}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is_private"
                    checked={selectedNote.is_private}
                    onChange={(e) => setSelectedNote({...selectedNote, is_private: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-is_private" className="text-sm">
                    Make this note private (only visible to you)
                  </Label>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => handleUpdateNote(selectedNote.id, {
                    title: selectedNote.title,
                    content: selectedNote.content,
                    is_private: selectedNote.is_private
                  })} className="flex-1">
                    Update Note
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedNote(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
