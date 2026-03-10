import { useState, useEffect, useMemo } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { useMutation } from '@tanstack/react-query';
import { updateOrganisation } from '@/lib/api/organisations';
import { createProgram, updateProgram, Program } from '@/lib/api/programs';
import { toast } from 'sonner';
import { format, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProgramDialog } from './components/program-dialog';

const orgSchema = z.object({
  name: z.string().min(1, 'Organisation name is required'),
});

type OrgFormData = z.infer<typeof orgSchema>;

export function OrganisationSettingsPage() {
  const { activeOrganisation, programs, isLoading, refreshOrganisation, refreshPrograms } = useOrganisation();
  const [isProcessingOrg, setIsProcessingOrg] = useState(false);
  
  // Program dialog state
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>(undefined);
  const [isProcessingProgram, setIsProcessingProgram] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: activeOrganisation?.name || '',
    },
  });

  useEffect(() => {
    if (activeOrganisation) {
      reset({ name: activeOrganisation.name });
    }
  }, [activeOrganisation, reset]);

  // Mutations
  const updateOrgMutation = useMutation({
    mutationFn: async (data: OrgFormData) => {
      if (!activeOrganisation) return;
      
      setIsProcessingOrg(true);
      try {
        await updateOrganisation(activeOrganisation.id, {
          name: data.name
        });

        toast.success('Organisation updated successfully');
        refreshOrganisation();
      } finally {
        setIsProcessingOrg(false);
      }
    }
  });

  const updateProgramStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'active' | 'inactive' }) => 
      updateProgram(id, { status }),
    onSuccess: () => {
      refreshPrograms();
      toast.success('Program status updated');
    }
  });

  const handleProgramSubmit = async (data: any) => {
    if (!activeOrganisation) return;
    setIsProcessingProgram(true);
    try {
      if (editingProgram) {
        await updateProgram(editingProgram.id, data);
        toast.success('Program updated successfully');
      } else {
        await createProgram({
          ...data,
          organisation_id: activeOrganisation.id
        });
        toast.success('Program created successfully');
      }
      refreshPrograms();
      setIsProgramDialogOpen(false);
    } catch (error) {
      console.error('Error handling program:', error);
      toast.error('Failed to save program');
    } finally {
      setIsProcessingProgram(false);
    }
  };

  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => {
      // 1. Active first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;

      // 2. Then by start_date (latest first)
      if (a.start_date && b.start_date) {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
      if (a.start_date) return -1;
      if (b.start_date) return 1;

      // 3. Fallback to created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [programs]);

  if (isLoading) return <div className="p-10 text-center font-bold text-gray-500">Loading settings...</div>;

  const isOverdue = (program: Program) => {
    if (program.status !== 'active' || !program.end_date) return false;
    return isAfter(new Date(), parseISO(program.end_date));
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading 
            title="Mentoring Programs" 
            description="Control your hospital's profile and mentoring program lifecycles" 
          />
        </Toolbar>
      </Container>

      <Container className="flex flex-col gap-5 lg:gap-7.5 mt-5">
        {/* Unified settings card */}
        <Card className="border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <form onSubmit={handleSubmit((data) => updateOrgMutation.mutate(data))} className="max-w-2xl space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-black uppercase text-gray-500 tracking-widest">Hospital / Organisation Name</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g. Fiona Stanley Hospital"
                    className={cn("h-11 rounded-xl font-medium", errors.name ? 'border-danger' : 'bg-gray-50 border-gray-100')}
                  />
                  <div className="flex gap-2 shrink-0">
                    {isDirty && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => reset()}
                        disabled={isProcessingOrg}
                        className="rounded-xl px-6 h-11 font-bold"
                      >
                        Discard
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={isProcessingOrg || !isDirty}
                      className="rounded-xl px-8 h-11 font-bold"
                    >
                      {isProcessingOrg ? (
                        <KeenIcon icon="loading" className="animate-spin" />
                      ) : (
                        'Save Name'
                      )}
                    </Button>
                  </div>
                </div>
                {errors.name && (
                  <p className="text-xs text-danger font-medium px-1">{errors.name.message}</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Mentoring Programs Section */}
        <Card className="border-0 sm:border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 py-5 border-b border-gray-100 px-3 sm:px-6">
            <div />
            <Button 
              variant="outline"
              size="sm" 
              className="gap-2 rounded-xl h-10 font-bold"
              onClick={() => { setEditingProgram(undefined); setIsProgramDialogOpen(true); }}
            >
              <KeenIcon icon="plus" />
              Add Program
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Program Details</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Date Range</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPrograms.map((program) => {
                    const overdue = isOverdue(program);
                    
                    return (
                      <tr key={program.id} className={cn(
                        "hover:bg-gray-50/50 transition-colors group", 
                        overdue && "bg-amber-50/30"
                      )}>
                        <td className="py-5 px-6">
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-gray-900 truncate">
                              {program.name}
                            </span>
                            {overdue && (
                              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                <KeenIcon icon="information-2" className="text-[10px]" />
                                Completion Due
                              </span>
                            )}
                          </div>
                        </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-gray-700">
                            {program.start_date ? format(new Date(program.start_date), 'MMM d, yyyy') : 'No Start'}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400">
                            to {program.end_date ? format(new Date(program.end_date), 'MMM d, yyyy') : 'No End'}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase border-none h-5 rounded-full px-2.5",
                          program.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {program.status}
                        </Badge>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {overdue && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-100"
                              onClick={() => updateProgramStatusMutation.mutate({ id: program.id, status: 'inactive' })}
                              disabled={updateProgramStatusMutation.isPending}
                            >
                              Finalise
                            </Button>
                          )}
                          
                          {program.status === 'inactive' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => updateProgramStatusMutation.mutate({ id: program.id, status: 'active' })}
                              disabled={updateProgramStatusMutation.isPending}
                            >
                              Activate
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            mode="icon" 
                            size="sm" 
                            className="size-9 rounded-xl hover:bg-gray-100 text-gray-500"
                            onClick={() => { setEditingProgram(program); setIsProgramDialogOpen(true); }}
                          >
                            <KeenIcon icon="pencil" className="text-lg" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {programs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <KeenIcon icon="coffee" className="text-4xl text-gray-200" />
                          <p className="text-sm font-bold text-gray-400 italic">No mentoring programs have been created yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Container>

      <ProgramDialog 
        open={isProgramDialogOpen}
        onOpenChange={setIsProgramDialogOpen}
        onSubmit={handleProgramSubmit}
        program={editingProgram}
        isLoading={isProcessingProgram}
      />
    </>
  );
}
