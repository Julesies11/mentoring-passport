import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useNotes } from '@/hooks/use-notes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StickyNote, Plus, Edit, Trash2, Eye, EyeOff, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export function MenteeNotesPage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { fetchPairNotes, createNote, updateNote, deleteNote } = useNotes();
  const { data: notes = [], isLoading } = fetchPairNotes();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [formData, setFormData] = useState({
    pair_id: '',
    title: '',
    content: '',
    is_private: false
  });

  // Filter notes for mentee's pairs
  const menteeNotes = notes.filter(note => 
    pairs.some(pair => pair.id === note.pair_id)
  );

  const privateNotes = menteeNotes.filter(note => note.is_private);
  const sharedNotes = menteeNotes.filter(note => !note.is_private);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement note creation
    console.log('Create note:', formData);
    setIsCreateDialogOpen(false);
    setFormData({ pair_id: '', title: '', content: '', is_private: false });
  };

  const handleEdit = (note: any) => {
    setSelectedNote(note);
    setFormData({
      pair_id: note.pair_id,
      title: note.title,
      content: note.content,
      is_private: note.is_private
    });
  };

  const handleDelete = (noteId: string) => {
    // TODO: Implement note deletion
    console.log('Delete note:', noteId);
  };

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notes</h1>
            <p className="text-sm text-gray-600">Manage your mentoring notes and reflections</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Add a new note to document your mentoring journey and reflections.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pair_id">Mentoring Relationship</Label>
                  <Select
                    value={formData.pair_id}
                    onValueChange={(value) => setFormData({ ...formData, pair_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mentoring relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {pairs.map((pair) => (
                        <SelectItem key={pair.id} value={pair.id}>
                          {pair.mentor?.full_name} - {pair.mentee?.full_name}
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
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter note title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your thoughts, reflections, or meeting notes here..."
                    rows={5}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_private"
                    checked={formData.is_private}
                    onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_private">Private note (only visible to you)</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Create Note</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7.5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Private Notes</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{privateNotes.length}</div>
              <p className="text-xs text-muted-foreground">Personal reflections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shared Notes</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sharedNotes.length}</div>
              <p className="text-xs text-muted-foreground">Visible to mentor</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 lg:gap-7.5">
          <div>
            <h3 className="text-lg font-semibold mb-4">All Notes</h3>
            {menteeNotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <StickyNote className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Start documenting your mentoring journey with notes about meetings, goals, and personal reflections.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Note
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {menteeNotes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{note.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(note.created_at), 'PPP')}
                            <Badge variant={note.is_private ? 'secondary' : 'outline'}>
                              {note.is_private ? 'Private' : 'Shared'}
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(note)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(note.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {note.content}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {pairs.find(p => p.id === note.pair_id)?.mentor?.full_name}
                        </div>
                        <Button size="sm" variant="outline">
                          Read More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Note-Taking Tips</CardTitle>
            <CardDescription>Best practices for effective mentoring notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Be Specific</h4>
                  <p className="text-sm text-muted-foreground">
                    Include concrete examples and specific details about your learning and experiences.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Reflect Regularly</h4>
                  <p className="text-sm text-muted-foreground">
                    Take notes after each meeting and weekly to track your progress and insights.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Set Action Items</h4>
                  <p className="text-sm text-muted-foreground">
                    Document specific goals and next steps to keep yourself accountable.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
