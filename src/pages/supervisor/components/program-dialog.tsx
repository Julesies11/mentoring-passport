import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Program } from '@/lib/api/programs';
import { KeenIcon } from '@/components/keenicons';
import { Switch } from '@/components/ui/switch';
import { useTaskLists } from '@/hooks/use-tasks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupItem, AvatarGroupTooltip } from '@/components/ui/avatar-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const programSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  task_list_id: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  supervisor_ids: z.array(z.string()).default([]),
});

type ProgramFormData = z.infer<typeof programSchema>;

interface ProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  program?: Program;
  isLoading?: boolean;
  allSupervisors?: any[];
}

export function ProgramDialog({
  open,
  onOpenChange,
  onSubmit,
  program,
  isLoading,
  allSupervisors = [],
}: ProgramDialogProps) {
  const { data: taskLists = [] } = useTaskLists();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      task_list_id: '',
      start_date: '',
      end_date: '',
      isActive: true,
      supervisor_ids: [],
    },
  });

  const isActive = watch('isActive');
  const selectedSupervisorIds = watch('supervisor_ids') || [];

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      if (program) {
        // Find supervisors currently assigned to this program
        const currentSupervisorIds = allSupervisors
          .filter(s => s.assigned_program_ids?.includes(program.id))
          .map(s => s.id);

        reset({
          name: program.name,
          task_list_id: program.task_list_id || '',
          start_date: program.start_date || '',
          end_date: program.end_date || '',
          isActive: program.status === 'active',
          supervisor_ids: currentSupervisorIds,
        });
      } else {
        reset({
          name: '',
          task_list_id: '',
          start_date: '',
          end_date: '',
          isActive: true,
          supervisor_ids: [],
        });
      }
    }
  }, [open, program, reset, allSupervisors]);

  const handleFormSubmit = async (data: ProgramFormData) => {
    const { isActive, ...rest } = data;
    await onSubmit({
      ...rest,
      status: isActive ? 'active' : 'inactive'
    });
  };

  const toggleSupervisor = (id: string) => {
    const current = [...selectedSupervisorIds];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setValue('supervisor_ids', current);
  };

  const filteredSupervisors = allSupervisors.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSupervisors = allSupervisors.filter(s => selectedSupervisorIds.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] p-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{program ? 'Edit Program' : 'Add New Program'}</DialogTitle>
          <DialogDescription>
            {program 
              ? 'Update the mentoring program details' 
              : 'Create a new mentoring program for your organisation'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70dvh]">
          <form id="program-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-6 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Program Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g. 2025 Residency Program"
                className={cn("rounded-xl h-11", errors.name ? 'border-danger' : '')}
              />
              {errors.name && (
                <p className="text-[10px] text-danger font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Assigned Supervisors</Label>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-[11px] font-bold">
                      <KeenIcon icon="plus" className="mr-1" /> Manage
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 overflow-hidden rounded-2xl shadow-2xl border-gray-100" align="end">
                    <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                      <div className="relative">
                        <KeenIcon icon="magnifier" className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search supervisors..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 h-9 bg-white text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[250px]">
                      <div className="p-2 space-y-1">
                        {filteredSupervisors.length > 0 ? (
                          filteredSupervisors.map((supervisor) => (
                            <div 
                              key={supervisor.id} 
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer hover:bg-gray-50",
                                selectedSupervisorIds.includes(supervisor.id) && "bg-primary-light/20 hover:bg-primary-light/30"
                              )}
                              onClick={() => toggleSupervisor(supervisor.id)}
                            >
                              <Avatar className="size-8">
                                <AvatarImage src={supervisor.avatar_url || ''} />
                                <AvatarFallback className="text-[10px] font-bold">
                                  {supervisor.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs font-bold text-gray-900 truncate">
                                  {supervisor.full_name || 'Unnamed'}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {supervisor.email}
                                </span>
                              </div>
                              <div className="shrink-0">
                                {selectedSupervisorIds.includes(supervisor.id) ? (
                                  <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                                    <KeenIcon icon="check" className="text-white text-[10px]" />
                                  </div>
                                ) : (
                                  <div className="size-5 rounded-full border-2 border-gray-200" />
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground py-8 text-center">No supervisors found</p>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 min-h-[54px]">
                {selectedSupervisors.length > 0 ? (
                  <div className="flex items-center justify-between w-full">
                    <AvatarGroup>
                      {selectedSupervisors.slice(0, 5).map((s) => (
                        <AvatarGroupItem key={s.id}>
                          <Avatar className="size-8 border-2 border-white ring-0">
                            <AvatarImage src={s.avatar_url || ''} />
                            <AvatarFallback className="text-[10px] font-black">
                              {s.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <AvatarGroupTooltip>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold">{s.full_name}</span>
                              <span className="text-[10px] opacity-80">{s.email}</span>
                            </div>
                          </AvatarGroupTooltip>
                        </AvatarGroupItem>
                      ))}
                      {selectedSupervisors.length > 5 && (
                        <div className="flex items-center justify-center size-8 rounded-full border-2 border-white bg-gray-100 text-[10px] font-black text-gray-500 z-10 -ml-2.5">
                          +{selectedSupervisors.length - 5}
                        </div>
                      )}
                    </AvatarGroup>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {selectedSupervisors.length} Assigned
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic pl-1">No supervisors assigned yet</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task_list" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Source Task Template</Label>
              <Select
                value={watch('task_list_id') || 'none'}
                onValueChange={(val) => setValue('task_list_id', val === 'none' ? null : val)}
                disabled={program?.status === 'inactive' || program?.status === 'archived'}
              >
                <SelectTrigger id="task_list" className="rounded-xl h-11">
                  <SelectValue placeholder="Select a task list template" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Task List (Start Empty)</SelectItem>
                  {taskLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                {program?.status === 'inactive' || program?.status === 'archived'
                  ? "The task list cannot be changed for an inactive or archived program."
                  : program 
                    ? "Changing this will refresh the program's task list from the new template."
                    : "Tasks from this template will be copied into the new program."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date" className="text-xs font-bold uppercase text-gray-500 tracking-wider">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="status-toggle" className="font-bold text-gray-900">Program Status</Label>
                <p className="text-[10px] text-muted-foreground">
                  {isActive ? 'This program is currently active' : 'This program is currently inactive'}
                </p>
              </div>
              <Switch
                id="status-toggle"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 flex-col sm:flex-row gap-2 bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="program-form"
            disabled={isLoading} 
            className="w-full sm:w-auto rounded-xl shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</>
            ) : (
              program ? 'Update Program' : 'Create Program'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


