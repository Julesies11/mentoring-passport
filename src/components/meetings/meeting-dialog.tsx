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
import { CalendarSyncGrid } from './calendar-sync-grid';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairId: string;
  meeting?: Meeting | null;
  initialTaskId?: string | null;
  initialDate?: string | null;
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
  initialDate,
  onSubmit,
  onDelete,
  isSubmitting = false,
}: MeetingDialogProps) {
  const { user, isSupervisor } = useAuth();
  const { pairings, selectedPairingId } = usePairing();
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [internalPairId, setInternalPairId] = useState(() => {
    return pairId || selectedPairingId || (pairings.length > 0 && !isSupervisor ? pairings[0].id : '');
  });

  useEffect(() => {
    if (open) {
      setCreatedMeeting(null);
      setIsEditing(false); // Default to Hub view if meeting exists
      
      // Set initial pair ID only when opening
      if (pairId) {
        setInternalPairId(pairId);
      } else if (selectedPairingId) {
        setInternalPairId(selectedPairingId);
      } else if (!isSupervisor && pairings.length > 0 && !internalPairId) {
        setInternalPairId(pairings[0].id);
      }
    }
  }, [open, pairId, selectedPairingId, pairings, isSupervisor]); // Removed internalPairId from dependencies to allow manual selection

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
    duration_minutes: 60,
    notes: '',
    pair_task_id: '',
    location: '',
    location_type: 'video' as 'in-person' | 'video' | 'phone' | 'other',
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
          duration_minutes: 60,
          notes: '',
          pair_task_id: '',
          location: '',
          location_type: 'video',
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
        const newType = meeting.location_type || 'video';
        const newDuration = meeting.duration_minutes || 60;

        if (
          prev.title === newTitle &&
          prev.date_time === formattedDate &&
          prev.duration_minutes === newDuration &&
          prev.notes === newNotes &&
          prev.pair_task_id === newTaskId &&
          prev.location === newLocation &&
          prev.location_type === newType
        ) {
          return prev;
        }

        return {
          title: newTitle,
          date_time: formattedDate,
          duration_minutes: newDuration,
          notes: newNotes,
          pair_task_id: newTaskId,
          location: newLocation,
          location_type: newType,
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
        const newDate = initialDate || prev.date_time || '';

        if (prev.pair_task_id === newTaskId && prev.title === newTitle && prev.date_time === newDate) {
          return prev;
        }

        return {
          ...prev,
          pair_task_id: newTaskId,
          title: newTitle,
          date_time: newDate,
        };
      });
    }
  }, [open, meeting, initialTaskId, initialDate, tasks]); 

  // Auto-select first pending task when tasks change for a new meeting
  useEffect(() => {
    if (open && !meeting && tasks.length > 0) {
      const firstPending = tasks.find(t => t.status !== 'completed') || tasks[0];
      if (firstPending && (!formData.pair_task_id || !tasks.find(t => t.id === formData.pair_task_id))) {
        setFormData(prev => ({
          ...prev,
          pair_task_id: firstPending.id,
          // Only update title if it's currently empty or was set from a previous task
          title: (prev.title === '' || tasks.some(t => t.name === prev.title)) ? firstPending.name : prev.title
        }));
      }
    }
  }, [tasks, open, meeting]);

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
      duration_minutes: formData.duration_minutes,
      pair_task_id: formData.pair_task_id,
      location: formData.location,
      location_type: formData.location_type,
    };

    try {
      const result = await onSubmit(submissionData);
      
      if (!meeting && result) {
        setCreatedMeeting(result as Meeting);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
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
            {partnerRole} • {(partner?.job_title_name || partner?.job_title) || 'Participant'}
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
    const activeOnly = sourcePairs.filter(p => 
      p.status === 'active' && p.program?.status === 'active'
    );

    return [...activeOnly].sort((a, b) => {
      const aDate = a.program?.start_date ? new Date(a.program.start_date).getTime() : 0;
      const bDate = b.program?.start_date ? new Date(b.program.start_date).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;

      const aName = (isSupervisor ? a.mentor?.full_name : (a.mentor_id === user?.id ? a.mentee?.full_name : a.mentor?.full_name)) || '';
      const bName = (isSupervisor ? b.mentor?.full_name : (b.mentor_id === user?.id ? b.mentee?.full_name : b.mentor?.full_name)) || '';
      return aName.localeCompare(bName);
    });
  }, [allPairs, pairings, isSupervisor, user?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[500px] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden border-none shadow-2xl rounded-2xl flex flex-col max-h-[90dvh] sm:max-h-[85dvh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {createdMeeting ? (
          /* 1. SUCCESS VIEW (Post-Creation) */
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="size-20 rounded-full bg-success/10 flex items-center justify-center mb-6 text-success shrink-0">
              <KeenIcon icon="check-circle" className="text-5xl" />
            </div>
            
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2">
                Meeting Scheduled!
              </h3>
              <p className="text-sm font-medium text-gray-500 max-w-xs mx-auto">
                Your mentoring session for <span className="text-gray-900 font-bold">"{createdMeeting.title}"</span> has been successfully added to the system.
              </p>
            </div>

            <div className="w-full bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8 space-y-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Date & Time</span>
                <span className="text-lg font-black text-gray-900">
                  {createdMeeting.date_time ? (
                    `${format(new Date(createdMeeting.date_time), 'EEEE, MMM do')} @ ${format(new Date(createdMeeting.date_time), 'HH:mm')}`
                  ) : 'Time not specified'}
                </span>
              </div>
              
              <div className="pt-2 border-t border-gray-200/50">
                <p className="text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-tight text-center">Sync to your calendar:</p>
                <CalendarSyncGrid meeting={createdMeeting} />
              </div>
            </div>

            <Button 
              onClick={() => onOpenChange(false)} 
              className="w-full h-12 shrink-0 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 mt-auto"
            >
              Done
            </Button>
          </div>
        ) : meeting && !isEditing ? (
          /* 2. MANAGEMENT HUB VIEW (Read-only + Sync + Edit/Delete) */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            <DialogHeader className="p-0 mb-4 text-center shrink-0">
              <DialogTitle className="text-xl font-black text-gray-900 leading-tight">
                {meeting.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                {/* Partner Context - Below Title */}
                {currentPair && (
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200/50">
                    <ProfileAvatar 
                      userId={isUserMentorInSelected ? currentPair.mentee?.id : currentPair.mentor?.id}
                      currentAvatar={isUserMentorInSelected ? currentPair.mentee?.avatar_url : currentPair.mentor?.avatar_url}
                      userName={isUserMentorInSelected ? currentPair.mentee?.full_name : currentPair.mentor?.full_name}
                      size="xs"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Mentoring Partner</span>
                      <span className="text-xs font-bold text-gray-900 leading-tight truncate">
                        {isUserMentorInSelected ? currentPair.mentee?.full_name : currentPair.mentor?.full_name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-gray-700">
                  <div className="size-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary shrink-0">
                    <KeenIcon icon="calendar" className="text-base" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Date & Time</span>
                    <span className="text-xs font-bold text-gray-900 leading-tight truncate">
                      {format(new Date(meeting.date_time), 'EEE, MMM do')} • {format(new Date(meeting.date_time), 'HH:mm')} ({meeting.duration_minutes}m)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <div className="size-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary shrink-0">
                    <KeenIcon icon="geolocation" className="text-base" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Location</span>
                    <span className="text-xs font-bold text-gray-900 leading-tight truncate">
                      {meeting.location || 'No location specified'}
                    </span>
                  </div>
                </div>

                {meeting.notes && (
                  <div className="flex items-start gap-3 pt-1">
                    <div className="size-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <KeenIcon icon="note-2" className="text-base" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Agenda / Notes</span>
                      <p className="text-[11px] font-medium text-gray-600 italic leading-snug line-clamp-3">
                        "{meeting.notes}"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sync to your calendar</p>
                <CalendarSyncGrid meeting={meeting} />
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-xl font-bold gap-2 border-gray-200 text-xs"
                    onClick={() => setIsEditing(true)}
                  >
                    <KeenIcon icon="pencil" className="text-gray-400" />
                    Update
                  </Button>
                  <Button 
                    onClick={() => onOpenChange(false)} 
                    className="flex-1 h-10 rounded-xl font-bold shadow-lg shadow-primary/20 text-xs"
                  >
                    Done
                  </Button>
                </div>
                
                {onDelete && (
                  <button 
                    type="button"
                    onClick={handleCancelMeeting}
                    className="text-[9px] font-black text-danger/40 hover:text-danger uppercase tracking-widest transition-colors py-1 cursor-pointer"
                  >
                    Cancel / Remove Meeting
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 3. FORM VIEW (Create or Edit Form) */
          <>
            <DialogHeader className="px-5 pt-5 pb-1 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  {meeting ? 'Edit Meeting' : 'Schedule New Meeting'}
                </DialogTitle>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-0 min-h-0">
              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {/* Pair selection - Unified logic for both Add and Edit */}
                  {(isSupervisor || pairings.length > 1) ? (
                    <div className="grid gap-1">
                      <Label className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">{partnerRoleLabel}</Label>
                      <Select value={internalPairId} onValueChange={setInternalPairId}>
                        <SelectTrigger 
                          className="h-8 sm:h-9 py-1 rounded-xl border-gray-200 bg-white font-bold text-xs overflow-hidden" 
                          aria-label="Select a mentoring pair"
                          data-testid="pair-select-trigger"
                        >
                          <div className="flex-1 min-w-0 overflow-hidden text-left">
                            <SelectValue placeholder="Select a mentoring pair" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-w-[450px]">
                          {availablePairs.map((pair) => (
                            <SelectItem key={pair.id} value={pair.id} className="py-1">
                              {renderPairItem(pair)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    /* Auto-display pair if single-choice (works for both Add and Edit) */
                    <div className="grid gap-1">
                      <Label className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">{partnerRoleLabel}</Label>
                      <div className="flex items-center gap-2 px-3 h-8 sm:h-9 bg-gray-50 rounded-xl border border-gray-100">
                        <KeenIcon icon="users" className="text-primary text-[10px] shrink-0" />
                        <span className="text-[11px] font-bold text-gray-700 truncate">{pairDisplay}</span>
                      </div>
                    </div>
                  )}

                  <div className={cn("grid gap-1 min-w-0", (isSupervisor || pairings.length > 1) ? "" : "sm:col-span-2")}>
                    <Label htmlFor="pair_task_id" className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">
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
                      <SelectTrigger id="pair_task_id" data-testid="task-select-trigger" className="h-8 sm:h-9 py-1 rounded-xl border-gray-200 bg-white font-bold text-xs text-left overflow-hidden">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <SelectValue placeholder={!internalPairId ? "Select a pair first" : "Select a task"} />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-w-[calc(100vw-2rem)] sm:max-w-[450px]">
                        {tasks.filter(t => t.status !== 'completed' || t.id === formData.pair_task_id).map((task) => {
                          const isCompleted = task.status === 'completed';
                          const isAwaiting = task.status === 'awaiting_review';
                          
                          return (
                            <SelectItem key={task.id} value={task.id} className="py-1.5" data-testid={`task-option-${task.id}`}>
                              <div className="flex items-center justify-between w-full gap-3 min-w-0">
                                <span className="font-bold text-[10px] leading-normal truncate flex-1 min-w-0">{task.name}</span>
                                <Badge 
                                  variant={isCompleted ? 'success' : (isAwaiting ? 'warning' : 'outline')} 
                                  className="shrink-0 text-[6px] h-3 uppercase font-black tracking-widest border-none"
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

                <div className="grid gap-1">
                  <Label htmlFor="title" className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Monthly Progress Sync"
                    className="h-8 sm:h-9 rounded-xl border-gray-200 font-bold text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
                  <div className="grid gap-1 sm:col-span-5">
                    <Label className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Date *</Label>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-8 sm:h-9 rounded-xl border-gray-200 justify-start text-left font-bold text-xs px-3",
                            !formData.date_time && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {formData.date_time ? format(new Date(formData.date_time), 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl border-gray-200 shadow-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date_time ? new Date(formData.date_time) : undefined}
                          onSelect={(date) => {
                            if (!date) return;
                            const newDate = new Date(date);
                            const current = formData.date_time ? new Date(formData.date_time) : new Date();
                            newDate.setHours(current.getHours(), current.getMinutes());
                            setFormData({ ...formData, date_time: format(newDate, "yyyy-MM-dd'T'HH:mm") });
                            setIsDatePickerOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-1 sm:col-span-4">
                    <Label className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Time *</Label>
                    <Select 
                      value={formData.date_time ? format(new Date(formData.date_time), 'HH:mm') : ''}
                      onValueChange={(time) => {
                        const [hours, minutes] = time.split(':');
                        const current = formData.date_time ? new Date(formData.date_time) : new Date();
                        current.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        setFormData({ ...formData, date_time: format(current, "yyyy-MM-dd'T'HH:mm") });
                      }}
                    >
                      <SelectTrigger className="h-8 sm:h-9 rounded-xl border-gray-200 bg-white font-bold text-xs px-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <SelectValue placeholder="Time" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-h-[200px]">
                        {Array.from({ length: 24 * 4 }).map((_, i) => {
                          const hour = Math.floor(i / 4).toString().padStart(2, '0');
                          const min = ((i % 4) * 15).toString().padStart(2, '0');
                          const timeString = `${hour}:${min}`;
                          return (
                            <SelectItem key={timeString} value={timeString} className="font-bold text-[11px] py-1.5">
                              {timeString}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1 sm:col-span-3">
                    <Label htmlFor="duration_minutes" className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Duration</Label>
                    <Select 
                      value={formData.duration_minutes.toString()} 
                      onValueChange={(value) => setFormData({...formData, duration_minutes: parseInt(value)})}
                    >
                      <SelectTrigger className="h-8 sm:h-9 rounded-xl border-gray-200 bg-white font-bold text-xs px-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                        <SelectItem value="15" className="font-bold text-[11px] py-1.5">15m</SelectItem>
                        <SelectItem value="30" className="font-bold text-[11px] py-1.5">30m</SelectItem>
                        <SelectItem value="45" className="font-bold text-[11px] py-1.5">45m</SelectItem>
                        <SelectItem value="60" className="font-bold text-[11px] py-1.5">1h</SelectItem>
                        <SelectItem value="90" className="font-bold text-[10px] py-1.5">1.5h</SelectItem>
                        <SelectItem value="120" className="font-bold text-[10px] py-1.5">2h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="location_type" className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Type</Label>
                    <Select 
                      value={formData.location_type} 
                      onValueChange={(value: any) => setFormData({...formData, location_type: value})}
                    >
                      <SelectTrigger className="h-8 sm:h-9 rounded-xl border-gray-200 bg-white font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                        <SelectItem value="in-person" className="font-bold text-[10px]">In Person</SelectItem>
                        <SelectItem value="video" className="font-bold text-[10px]">Video</SelectItem>
                        <SelectItem value="phone" className="font-bold text-[10px]">Phone</SelectItem>
                        <SelectItem value="other" className="font-bold text-[10px]">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="location" className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Location / Link</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Zoom Link / Room"
                      className="h-8 sm:h-9 rounded-xl border-gray-200 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="notes" className="text-[9px] font-black uppercase text-gray-400 tracking-wider px-1">Agenda / Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Short agenda..."
                    className="rounded-xl border-gray-200 font-medium text-xs resize-none p-2 min-h-[50px] sm:min-h-[60px]"
                  />
                </div>

                <div className="pt-1 flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 h-9 rounded-xl font-bold text-[11px] border-gray-200" onClick={() => meeting ? setIsEditing(false) : onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 h-9 rounded-xl font-bold text-[11px] shadow-lg shadow-primary/20" disabled={isSubmitting || !formData.title || !formData.date_time || !formData.pair_task_id || !internalPairId}>
                    {isSubmitting ? (
                      <KeenIcon icon="loading" className="animate-spin mr-1.5" />
                    ) : (
                      <KeenIcon icon="check" className="mr-1.5" />
                    )}
                    {meeting ? 'Save' : 'Schedule'}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
