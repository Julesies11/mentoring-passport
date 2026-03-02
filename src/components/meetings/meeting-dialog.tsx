import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  type Meeting, 
} from '@/lib/api/meetings';
import { fetchPairTasks } from '@/lib/api/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/auth/context/auth-context';
import { usePairing } from '@/providers/pairing-provider';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairId: string;
  meeting?: Meeting | null;
  initialTaskId?: string | null;
  onSubmit: (data: any) => Promise<void>;
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
  const { isMentor } = useAuth();
  const { pairings } = usePairing();
  
  const currentPair = pairings.find(p => p.id === pairId);
  const otherUser = isMentor ? currentPair?.mentee : currentPair?.mentor;
  const participantName = otherUser?.full_name || 'Program Member';

  const [formData, setFormData] = useState({
    title: '',
    date_time: '',
    notes: '',
    pair_task_id: '',
    location: '',
    meeting_type: 'virtual' as 'in_person' | 'virtual' | 'phone',
  });

  // Fetch tasks for this pair to allow linking
  const { data: tasks = [] } = useQuery({
    queryKey: ['pair-tasks', pairId],
    queryFn: () => fetchPairTasks(pairId),
    enabled: !!pairId && open,
  });

  useEffect(() => {
    if (!open) return;

    let targetTaskId = initialTaskId;
    if (!targetTaskId && tasks.length > 0) {
      const firstPending = tasks.find(t => t.status !== 'completed');
      if (firstPending) targetTaskId = firstPending.id;
    }

    if (meeting) {
      setFormData({
        title: meeting.title,
        date_time: meeting.date_time ? format(new Date(meeting.date_time), "yyyy-MM-dd'T'HH:mm") : '',
        notes: meeting.notes || '',
        pair_task_id: meeting.pair_task_id || '',
        location: meeting.location || '',
        meeting_type: (meeting.meeting_type as any) || 'virtual',
      });
    } else {
      const selectedTask = tasks.find(t => t.id === targetTaskId);
      setFormData({
        title: selectedTask ? selectedTask.name : '',
        date_time: '',
        notes: '',
        pair_task_id: targetTaskId || '',
        location: '',
        meeting_type: 'virtual',
      });
    }
  }, [meeting, initialTaskId, open, tasks]);

  useEffect(() => {
    if (!meeting && open && formData.pair_task_id && formData.pair_task_id !== 'none') {
      const selectedTask = tasks.find(t => t.id === formData.pair_task_id);
      if (selectedTask && (!formData.title || tasks.some(t => t.name === formData.title))) {
        setFormData(prev => ({ ...prev, title: selectedTask.name }));
      }
    }
  }, [formData.pair_task_id, tasks, meeting, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date_time || !formData.pair_task_id || formData.pair_task_id === 'none') return;

    const submissionData = {
      pair_id: pairId,
      title: formData.title,
      notes: formData.notes,
      description: formData.notes,
      scheduled_at: new Date(formData.date_time).toISOString(),
      date_time: new Date(formData.date_time).toISOString(),
      pair_task_id: formData.pair_task_id,
      location: formData.location,
      meeting_type: formData.meeting_type,
    };

    await onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{meeting ? 'Edit Meeting' : 'Schedule New Meeting'}</DialogTitle>
          <DialogDescription>
            {meeting 
              ? 'Update the meeting details and associated task.' 
              : `Schedule a meeting with ${participantName}.`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 py-4 overflow-hidden">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-gray-900 font-semibold">Program Member</Label>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="size-6 rounded-full bg-primary-light flex items-center justify-center text-[10px] text-primary font-bold">
                  {participantName.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-700 truncate">{participantName}</span>
              </div>
            </div>

            <div className="grid gap-2 min-w-0">
              <Label htmlFor="pair_task_id" className="text-gray-900 font-semibold flex items-center gap-1">
                Link to Task <span className="text-danger">*</span>
              </Label>
              <div className="w-full">
                <Select
                  value={formData.pair_task_id}
                  onValueChange={(val) => setFormData({ ...formData, pair_task_id: val })}
                  required
                >
                  <SelectTrigger className="w-full max-w-full overflow-hidden">
                    <SelectValue placeholder="Select a task" className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-60px)] sm:max-w-[460px]">
                    {tasks.map((task) => {
                      const isCompleted = task.status === 'completed';
                      return (
                        <SelectItem key={task.id} value={task.id} className="max-w-full">
                          <div className="flex items-center justify-between w-full gap-4 pr-2 overflow-hidden">
                            <span className="truncate flex-1 min-w-0">{task.name}</span>
                            <Badge 
                              variant={isCompleted ? 'success' : 'outline'} 
                              size="xs"
                              className="shrink-0"
                            >
                              {isCompleted ? 'Completed' : 'Pending'}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="meeting_type" className="text-gray-900 font-semibold">Type</Label>
              <Select 
                value={formData.meeting_type} 
                onValueChange={(value: any) => setFormData({...formData, meeting_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location" className="text-gray-900 font-semibold">Location / Link</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Office #204 or Zoom link"
            />
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

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title || !formData.date_time}>
              {isSubmitting ? (
                <><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</>
              ) : (
                <><KeenIcon icon="check" className="mr-2" /> {meeting ? 'Update Meeting' : 'Schedule Meeting'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
