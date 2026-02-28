import { useState, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  type Meeting, 
  type CreateMeetingInput,
} from '@/lib/api/meetings';
import { fetchPairTasks } from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairId: string;
  meeting?: Meeting | null;
  initialTaskId?: string | null;
  onSubmit: (data: CreateMeetingInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function MeetingDialog({
  open,
  onOpenChange,
  pairId,
  meeting,
  initialTaskId,
  onSubmit,
  isSubmitting = false,
}: MeetingDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    date_time: '',
    notes: '',
    pair_task_id: '',
  });

  // Fetch tasks for this pair to allow linking
  const { data: tasks = [] } = useQuery({
    queryKey: ['pair-tasks', pairId],
    queryFn: () => fetchPairTasks(pairId),
    enabled: !!pairId && open,
  });

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        date_time: meeting.date_time ? format(new Date(meeting.date_time), "yyyy-MM-dd'T'HH:mm") : '',
        notes: meeting.notes || '',
        pair_task_id: meeting.pair_task_id || '',
      });
    } else {
      setFormData({
        title: '',
        date_time: '',
        notes: '',
        pair_task_id: initialTaskId || '',
      });
    }
  }, [meeting, initialTaskId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date_time) return;

    await onSubmit({
      pair_id: pairId,
      title: formData.title,
      notes: formData.notes,
      date_time: new Date(formData.date_time).toISOString(),
      pair_task_id: formData.pair_task_id === 'none' ? null : formData.pair_task_id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{meeting ? 'Edit Meeting' : 'Schedule New Meeting'}</DialogTitle>
          <DialogDescription>
            {meeting 
              ? 'Update the meeting details and associated task.' 
              : 'Set a title, date, and link this meeting to a specific task.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-gray-900 font-semibold">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Goal Review, Monthly Sync"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date_time" className="text-gray-900 font-semibold">Date & Time *</Label>
            <Input
              id="date_time"
              type="datetime-local"
              value={formData.date_time}
              onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pair_task_id" className="text-gray-900 font-semibold">Link to Task</Label>
            <Select
              value={formData.pair_task_id || 'none'}
              onValueChange={(val) => setFormData({ ...formData, pair_task_id: val })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task to link (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific task</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-gray-900 font-semibold">Agenda / Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="What will be discussed?"
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title || !formData.date_time}>
              {isSubmitting ? (
                <Fragment><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</Fragment>
              ) : (
                <Fragment><KeenIcon icon="check" className="mr-2" /> {meeting ? 'Update Meeting' : 'Schedule Meeting'}</Fragment>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
