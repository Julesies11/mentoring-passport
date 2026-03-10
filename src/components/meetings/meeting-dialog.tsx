import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  type Meeting, 
} from '@/lib/api/meetings';
import { fetchPairTasks } from '@/lib/api/tasks';
import { fetchPair, fetchPairs } from '@/lib/api/pairs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { useAuth } from '@/auth/context/auth-context';
import { usePairing } from '@/providers/pairing-provider';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairId: string;
  meeting?: Meeting | null;
  initialTaskId?: string | null;
  onSubmit: (data: any) => Promise<void>;
  onDelete?: (meetingId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function MeetingDialog({
  open,
  onOpenChange,
  pairId,
  meeting,
  initialTaskId,
  onSubmit,
  onDelete,
  isSubmitting = false,
}: MeetingDialogProps) {
  const { user, isSupervisor } = useAuth();
  const { pairings, selectedPairingId } = usePairing();
  
  const [internalPairId, setInternalPairId] = useState(() => {
    return pairId || selectedPairingId || (pairings.length > 0 && !isSupervisor ? pairings[0].id : '');
  });

  useEffect(() => {
    if (open) {
      if (pairId) {
        setInternalPairId(pairId);
      } else if (selectedPairingId) {
        setInternalPairId(selectedPairingId);
      } else if (!isSupervisor && pairings.length > 0 && !internalPairId) {
        setInternalPairId(pairings[0].id);
      }
    }
  }, [open, pairId, selectedPairingId, pairings, isSupervisor, internalPairId]);

  const { data: allPairs = [] } = useQuery({
    queryKey: ['pairs', 'active'],
    queryFn: async () => {
      const pairs = await fetchPairs();
      return pairs.filter(p => p.status === 'active');
    },
    enabled: isSupervisor && open,
  });

  const contextPair = pairings.find(p => p.id === internalPairId);
  const { data: fetchedPair } = useQuery({
    queryKey: ['pair', internalPairId],
    queryFn: () => fetchPair(internalPairId),
    enabled: !!internalPairId && open && !contextPair,
  });

  const currentPair = contextPair || fetchedPair;
  
  // Logic for dynamic label like tasks page
  const isUserMentorInSelected = currentPair?.mentor_id === user?.id;
  const partnerRoleLabel = isSupervisor 
    ? 'MENTORING PAIR' 
    : (isUserMentorInSelected ? 'YOUR MENTEE' : 'YOUR MENTOR');

  const mentorName = currentPair?.mentor?.full_name || 'Mentor';
  const menteeName = currentPair?.mentee?.full_name || 'Mentee';
  const pairDisplay = currentPair ? `${mentorName} ↔ ${menteeName}` : 'No pair selected';

  const [formData, setFormData] = useState({
    title: '',
    date_time: '',
    notes: '',
    pair_task_id: '',
    location: '',
    meeting_type: 'virtual' as 'in_person' | 'virtual' | 'phone',
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['pair-tasks', internalPairId],
    queryFn: () => fetchPairTasks(internalPairId),
    enabled: !!internalPairId && open,
  });

  useEffect(() => {
    if (!open) {
      setFormData(prev => {
        if (!prev.title && !prev.date_time && !prev.pair_task_id) return prev;
        return {
          title: '',
          date_time: '',
          notes: '',
          pair_task_id: '',
          location: '',
          meeting_type: 'virtual',
        };
      });
      return;
    }

    if (meeting) {
      const formattedDate = meeting.date_time ? format(new Date(meeting.date_time), "yyyy-MM-dd'T'HH:mm") : '';
      setFormData(prev => {
        const newTitle = meeting.title || '';
        const newNotes = meeting.notes || '';
        const newTaskId = meeting.pair_task_id || '';
        const newLocation = meeting.location || '';
        const newType = (meeting.meeting_type as any) || 'virtual';

        if (
          prev.title === newTitle &&
          prev.date_time === formattedDate &&
          prev.notes === newNotes &&
          prev.pair_task_id === newTaskId &&
          prev.location === newLocation &&
          prev.meeting_type === newType
        ) {
          return prev;
        }

        return {
          title: newTitle,
          date_time: formattedDate,
          notes: newNotes,
          pair_task_id: newTaskId,
          location: newLocation,
          meeting_type: newType,
        };
      });
    } else {
      let targetTaskId = initialTaskId;
      if (!targetTaskId && tasks.length > 0) {
        const firstPending = tasks.find(t => t.status !== 'completed');
        if (firstPending) targetTaskId = firstPending.id;
      }

      const selectedTask = tasks.find(t => t.id === targetTaskId);

      setFormData(prev => {
        const newTaskId = targetTaskId || prev.pair_task_id || '';
        const newTitle = (selectedTask && prev.title === '') ? selectedTask.name : prev.title;

        if (prev.pair_task_id === newTaskId && prev.title === newTitle) {
          return prev;
        }

        return {
          ...prev,
          pair_task_id: newTaskId,
          title: newTitle,
        };
      });
    }
  }, [open, meeting, initialTaskId, tasks]); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date_time || !formData.pair_task_id || !internalPairId) {
      return;
    }

    const submissionData = {
      pair_id: internalPairId,
      title: formData.title,
      notes: formData.notes,
      date_time: new Date(formData.date_time).toISOString(),
      pair_task_id: formData.pair_task_id,
      location: formData.location,
      meeting_type: formData.meeting_type,
    };

    try {
      await onSubmit(submissionData);
      onOpenChange(false);
    } catch (error) {
      // Error is typically handled by the parent's toast, but we catch to prevent unhandled rejections
      console.error('Failed to submit meeting:', error);
    }
  };

  const handleCancelMeeting = async () => {
    if (!meeting || !onDelete) return;
    if (confirm('Are you sure you want to cancel and remove this meeting? This action cannot be undone.')) {
      await onDelete(meeting.id);
      onOpenChange(false);
    }
  };

  const renderPairItem = (pair: any) => {
    const isUserMentor = pair.mentor_id === user?.id;
    const partner = isUserMentor ? pair.mentee : pair.mentor;
    const partnerName = partner?.full_name || partner?.email || 'Unknown User';
    const partnerRole = isUserMentor ? 'Mentee' : 'Mentor';
    const isProgramActive = pair.program?.status === 'active';

    if (isSupervisor) {
      return (
        <div className="flex flex-col w-full py-1 gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs truncate">{pair.mentor?.full_name}</span>
              <span className="text-[8px] text-gray-400 uppercase font-black tracking-tighter">Mentor</span>
            </div>
            <span className="text-gray-300 shrink-0 text-[10px]">↔</span>
            <div className="flex flex-col items-end min-w-0 text-right">
              <span className="font-bold text-xs truncate">{pair.mentee?.full_name}</span>
              <span className="text-[8px] text-gray-400 uppercase font-black tracking-tighter">Mentee</span>
            </div>
          </div>
          <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest truncate border-t border-gray-50 pt-1">
            {pair.program?.name || 'Standard Program'}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 w-full overflow-hidden">
        <div className="relative shrink-0">
          <ProfileAvatar
            userId={partner?.id || ''}
            currentAvatar={partner?.avatar_url}
            userName={partnerName}
            size="sm"
          />
          {isProgramActive && (
            <span className="absolute bottom-0 right-0 size-2 bg-success rounded-full border border-white"></span>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <span className="font-bold text-xs truncate block">{partnerName}</span>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight truncate block">
            {partnerRole} • {partner?.job_title || 'Participant'}
          </span>
          <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest truncate block">
            {pair.program?.name || 'Standard Program'}
          </span>
        </div>
      </div>
    );
  };

  const availablePairs = useMemo(() => {
    const sourcePairs = isSupervisor ? allPairs : pairings;
    
    // 1. Only show "Double-Active" pairs (Active Pair AND Active Program)
    const activeOnly = sourcePairs.filter(p => 
      p.status === 'active' && p.program?.status === 'active'
    );

    // 2. Apply Gold Standard Sorting
    return [...activeOnly].sort((a, b) => {
      // Latest Program Start Date (desc)
      const aDate = a.program?.start_date ? new Date(a.program.start_date).getTime() : 0;
      const bDate = b.program?.start_date ? new Date(b.program.start_date).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;

      // Name alphabetical
      const aName = (isSupervisor ? a.mentor?.full_name : (a.mentor_id === user?.id ? a.mentee?.full_name : a.mentor?.full_name)) || '';
      const bName = (isSupervisor ? b.mentor?.full_name : (b.mentor_id === user?.id ? b.mentee?.full_name : b.mentor?.full_name)) || '';
      return aName.localeCompare(bName);
    });
  }, [allPairs, pairings, isSupervisor, user?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[500px] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden border-none shadow-2xl rounded-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
            {meeting ? 'Edit Meeting' : 'Schedule New Meeting'}
          </DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs font-medium text-gray-500">
            {meeting 
              ? 'Update meeting details or cancel the session.' 
              : `Schedule a mentoring session for your relationship.`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 pt-2 sm:pt-3 space-y-3 sm:space-y-4 overflow-y-auto max-h-[85vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="grid gap-1 sm:gap-1.5">
              <Label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">{partnerRoleLabel}</Label>
              {(isSupervisor || pairings.length > 1) && !meeting ? (
                <Select value={internalPairId} onValueChange={setInternalPairId}>
                  <SelectTrigger 
                    className="h-9 sm:h-10 py-2 rounded-xl border-gray-200 bg-white font-bold text-xs sm:text-sm overflow-hidden" 
                    aria-label="Select a mentoring pair"
                    data-testid="pair-select-trigger"
                  >
                    <div className="flex-1 min-w-0 overflow-hidden text-left">
                      <SelectValue placeholder="Select a mentoring pair" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-w-[450px]">
                    {availablePairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id} className="py-2">
                        {renderPairItem(pair)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 px-3 h-9 sm:h-10 bg-gray-50 rounded-xl border border-gray-100">
                  <KeenIcon icon="users" className="text-primary text-xs shrink-0" />
                  <span className="text-xs font-bold text-gray-700 truncate" data-testid="pair-display">{pairDisplay}</span>
                </div>
              )}
            </div>

            <div className="grid gap-1 sm:gap-1.5 min-w-0">
              <Label htmlFor="pair_task_id" className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">
                Link to Task <span className="text-danger">*</span>
              </Label>
              <Select
                value={formData.pair_task_id}
                onValueChange={(val) => {
                  const selectedTask = tasks.find(t => t.id === val);
                  setFormData({ 
                    ...formData, 
                    pair_task_id: val,
                    title: selectedTask ? selectedTask.name : formData.title
                  });
                }}
                required
                disabled={!internalPairId || isTasksLoading}
              >
                <SelectTrigger id="pair_task_id" data-testid="task-select-trigger" className="h-9 sm:h-10 py-2 rounded-xl border-gray-200 bg-white font-bold text-xs sm:text-sm text-left overflow-hidden">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <SelectValue placeholder={!internalPairId ? "Select a pair first" : "Select a task"} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-w-[calc(100vw-2rem)] sm:max-w-[450px]">
                  {tasks.filter(t => t.status !== 'completed' || t.id === formData.pair_task_id).map((task) => {
                    const isCompleted = task.status === 'completed';
                    const isAwaiting = task.status === 'awaiting_review';
                    
                    return (
                      <SelectItem key={task.id} value={task.id} className="py-2" data-testid={`task-option-${task.id}`}>
                        <div className="flex items-center justify-between w-full gap-3 min-w-0">
                          <span className="font-bold text-[11px] leading-normal truncate flex-1 min-w-0">{task.name}</span>
                          <Badge 
                            variant={isCompleted ? 'success' : (isAwaiting ? 'warning' : 'outline')} 
                            className="shrink-0 text-[7px] h-3.5 uppercase font-black tracking-widest border-none"
                          >
                            {isCompleted ? 'Validated' : (isAwaiting ? 'Review' : 'Pending')}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1 sm:gap-1.5">
            <Label htmlFor="title" className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Monthly Progress Sync"
              className="h-9 sm:h-10 rounded-xl border-gray-200 font-bold text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="grid gap-1 sm:gap-1.5">
              <Label htmlFor="date_time" className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">Date & Time *</Label>
              <Input
                id="date_time"
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                className="h-9 sm:h-10 rounded-xl border-gray-200 font-bold text-xs"
                required
              />
            </div>

            <div className="grid gap-1 sm:gap-1.5">
              <Label htmlFor="meeting_type" className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">Type</Label>
              <Select 
                value={formData.meeting_type} 
                onValueChange={(value: any) => setFormData({...formData, meeting_type: value})}
              >
                <SelectTrigger className="h-9 sm:h-10 rounded-xl border-gray-200 bg-white font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                  <SelectItem value="in_person" className="font-bold text-[11px] sm:text-xs">In Person</SelectItem>
                  <SelectItem value="virtual" className="font-bold text-[11px] sm:text-xs">Virtual</SelectItem>
                  <SelectItem value="phone" className="font-bold text-[11px] sm:text-xs">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1 sm:gap-1.5">
            <Label htmlFor="location" className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">Location / Link</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Zoom Link or Meeting Room"
              className="h-9 sm:h-10 rounded-xl border-gray-200 font-bold text-xs"
            />
          </div>

          <div className="grid gap-1 sm:gap-1.5">
            <Label htmlFor="notes" className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-wider px-1">Agenda / Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="What would you like to discuss?"
              className="rounded-xl border-gray-200 font-medium text-xs resize-none p-3 min-h-[60px] sm:min-h-[70px]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
            <div className="flex flex-1 gap-2 sm:gap-3">
              <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs border-gray-200" onClick={() => onOpenChange(false)}>
                Dismiss
              </Button>
              <Button type="submit" className="flex-1 h-10 rounded-xl font-bold text-xs shadow-lg shadow-primary/20" disabled={isSubmitting || !formData.title || !formData.date_time || !formData.pair_task_id || !internalPairId}>
                {isSubmitting ? (
                  <KeenIcon icon="loading" className="animate-spin mr-1.5" />
                ) : (
                  <KeenIcon icon="check" className="mr-1.5" />
                )}
                {meeting ? 'Update' : 'Schedule'}
              </Button>
            </div>
            
            {meeting && onDelete && (
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 sm:w-auto w-full rounded-xl font-bold text-[10px] sm:text-xs border-danger/20 text-danger hover:bg-danger hover:text-white transition-all px-4"
                onClick={handleCancelMeeting}
              >
                <KeenIcon icon="trash" className="mr-1.5" />
                Cancel Meeting
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
