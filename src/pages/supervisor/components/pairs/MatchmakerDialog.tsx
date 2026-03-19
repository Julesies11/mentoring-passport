import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/search-input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';

interface MatchmakerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: any[];
  pairs: any[];
  onCreatePair: (mentorId: string, menteeId: string) => Promise<void>;
  isCreating: boolean;
  initialMentorId?: string;
}

export function MatchmakerDialog({ 
  open, 
  onOpenChange, 
  participants, 
  pairs, 
  onCreatePair,
  isCreating,
  initialMentorId = ''
}: MatchmakerDialogProps) {
  const [mentorSearch, setMentorSearch] = useState('');
  const [menteeSearch, setMenteeSearch] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState(initialMentorId);
  const [selectedMenteeId, setSelectedMenteeId] = useState('');

  // Update selected mentor when opened with a specific ID
  useEffect(() => {
    if (open) {
      setSelectedMentorId(initialMentorId);
      setSelectedMenteeId('');
      setMentorSearch('');
      setMenteeSearch('');
    }
  }, [open, initialMentorId]);

  const getParticipantLoad = (participantId: string) => {
    const mentorCount = pairs.filter(p => p.mentor_id === participantId && p.status === 'active').length;
    const menteeCount = pairs.filter(p => p.mentee_id === participantId && p.status === 'active').length;
    return { mentorCount, menteeCount };
  };

  const filteredParticipants = (search: string, excludeId?: string) => {
    return participants
      .filter(p => p.id !== excludeId)
      .filter(p => 
        p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.department?.toLowerCase().includes(search.toLowerCase()) ||
        p.job_title_name?.toLowerCase().includes(search.toLowerCase())
      );
  };

  const selectedMentor = participants.find(p => p.id === selectedMentorId);
  const selectedMentee = participants.find(p => p.id === selectedMenteeId);

  const handleCreate = async () => {
    if (!selectedMentorId || !selectedMenteeId) return;
    await onCreatePair(selectedMentorId, selectedMenteeId);
    setSelectedMentorId('');
    setSelectedMenteeId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent 
          className="max-w-[800px] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden flex flex-col h-[85dvh] rounded-2xl border-none shadow-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:px-6 sm:py-5 border-b border-gray-100 shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">Mentoring Matchmaker</DialogTitle>
            <DialogDescription className="text-[10px] sm:text-sm text-gray-500">
              Select a mentor and a mentee from the program members to create a new pairing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">
            {/* Mentor Column */}
            <div className="flex-1 flex flex-col bg-gray-50/30 border-b sm:border-b-0 sm:border-r border-gray-100 min-h-0">
              <div className="p-3 sm:p-4 border-b border-gray-100 bg-white/50 shrink-0">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-blue-600 tracking-wider">Select Mentor</span>
                  {selectedMentor && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 animate-in fade-in zoom-in duration-300">
                      Selected
                    </Badge>
                  )}
                </div>
                <SearchInput
                  placeholder="Search mentors..." 
                  value={mentorSearch}
                  onChange={(e) => setMentorSearch(e.target.value)}
                  onClear={() => setMentorSearch('')}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                {filteredParticipants(mentorSearch, selectedMenteeId).map((participant) => {
                  const load = getParticipantLoad(participant.id);
                  const isSelected = selectedMentorId === participant.id;
                  
                  return (
                    <div
                      key={participant.id}
                      onClick={() => setSelectedMentorId(isSelected ? '' : participant.id)}
                      className={cn(
                        "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200 shadow-sm" 
                          : "bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                      )}
                    >
                      <Avatar className="size-7 sm:size-8 shrink-0">
                        <AvatarImage src={getAvatarPublicUrl(participant.avatar_url, participant.id)} alt={participant.full_name || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                          {getInitials(participant.full_name || participant.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs sm:text-sm font-bold truncate", isSelected ? "text-blue-900" : "text-gray-900")}>
                          {participant.full_name || 'No Name'}
                        </p>
                        {(participant.job_title_name || participant.job_title) && (
                          <p className="text-[8px] sm:text-[9px] text-blue-600/70 truncate uppercase font-bold leading-tight">
                            {participant.job_title_name || participant.job_title}
                          </p>
                        )}
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate uppercase font-medium">
                          {participant.department || 'General'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-1">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">Mentoring:</span>
                          <span className={cn("text-[10px] font-bold", load.mentorCount > 0 ? "text-blue-600" : "text-gray-400")}>
                            {load.mentorCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connection Visual */}
            <div className="h-6 sm:h-auto w-full sm:w-12 flex items-center sm:flex-col justify-center bg-white z-10 relative shrink-0">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-100 sm:hidden" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-100 hidden sm:block" />
              <div className="size-6 sm:size-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm z-20 relative">
                <KeenIcon icon="arrows-loop" className={cn("text-xs sm:text-xl transition-all duration-500", (selectedMentorId && selectedMenteeId) ? "text-primary rotate-180" : "text-gray-300")} />
              </div>
            </div>

            {/* Mentee Column */}
            <div className="flex-1 flex flex-col bg-gray-50/30 sm:border-l border-gray-100 min-h-0">
              <div className="p-3 sm:p-4 border-b border-gray-100 bg-white/50 shrink-0">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-green-600 tracking-wider">Select Mentee</span>
                  {selectedMentee && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 animate-in fade-in zoom-in duration-300">
                      Selected
                    </Badge>
                  )}
                </div>
                <SearchInput
                  placeholder="Search mentees..." 
                  value={menteeSearch}
                  onChange={(e) => setMenteeSearch(e.target.value)}
                  onClear={() => setMenteeSearch('')}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                {filteredParticipants(menteeSearch, selectedMentorId).map((participant) => {
                  const load = getParticipantLoad(participant.id);
                  const isSelected = selectedMenteeId === participant.id;
                  
                  return (
                    <div
                      key={participant.id}
                      onClick={() => setSelectedMenteeId(isSelected ? '' : participant.id)}
                      className={cn(
                        "group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-green-50 border-green-200 ring-1 ring-green-200 shadow-sm" 
                          : "bg-white border-gray-100 hover:border-green-200 hover:bg-gray-50"
                      )}
                    >
                      <Avatar className="size-7 sm:size-8 shrink-0">
                        <AvatarImage src={getAvatarPublicUrl(participant.avatar_url, participant.id)} alt={participant.full_name || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                          {getInitials(participant.full_name || participant.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs sm:text-sm font-bold truncate", isSelected ? "text-green-900" : "text-gray-900")}>
                          {participant.full_name || 'No Name'}
                        </p>
                        {(participant.job_title_name || participant.job_title) && (
                          <p className="text-[8px] sm:text-[9px] text-green-600/70 truncate uppercase font-bold leading-tight">
                            {participant.job_title_name || participant.job_title}
                          </p>
                        )}
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate uppercase font-medium">
                          {participant.department || 'General'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-1">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">Mentored by:</span>
                          <span className={cn("text-[10px] font-bold", load.menteeCount > 0 ? "text-green-600" : "text-gray-400")}>
                            {load.menteeCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:px-6 sm:py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden justify-center sm:justify-start w-full sm:w-auto">
              {selectedMentor && selectedMentee ? (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm animate-in slide-in-from-left duration-300 min-w-0 w-full sm:w-auto">
                  <span className="font-bold text-blue-600 truncate max-w-[40%] sm:max-w-[120px]">{selectedMentor.full_name || selectedMentor.email}</span>
                  <KeenIcon icon="arrow-right" className="text-gray-300 text-[10px] sm:text-xs shrink-0" />
                  <span className="font-bold text-green-600 truncate max-w-[40%] sm:max-w-[120px]">{selectedMentee.full_name || selectedMentee.email}</span>
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground italic text-center sm:text-left">Select a mentor and mentee...</p>
              )}
            </div>
            <div className="flex flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:h-11 flex-1 sm:flex-none px-6 font-bold rounded-xl border-gray-200">
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                className="h-10 sm:h-11 flex-1 sm:flex-none px-8 font-bold rounded-xl shadow-lg shadow-primary/20"
                disabled={!selectedMentorId || !selectedMenteeId || isCreating}
              >
                {isCreating ? (
                  <>
                    <KeenIcon icon="loading" className="animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : 'Create Pairing'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
