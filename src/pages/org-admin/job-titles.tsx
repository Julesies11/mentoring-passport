import { useState, useMemo } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading, ToolbarActions } from '@/layouts/demo1/components/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { useJobTitles } from '@/hooks/use-job-titles';
import { useParticipants } from '@/hooks/use-participants';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Checkbox } from '@/components/ui/checkbox';

export function OrgAdminJobTitlesPage() {
  const { activeOrganisation } = useOrganisation();
  const { 
    jobTitles, 
    isLoading: isLoadingTitles, 
    createJobTitle, 
    updateJobTitle, 
    toggleJobTitleStatus,
    isCreating,
    isUpdating,
    isToggling
  } = useJobTitles();

  const { participants, isLoading: isLoadingParticipants } = useParticipants();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<{ id: string, title: string, is_active: boolean } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isActiveValue, setIsActiveValue] = useState(true);

  const handleOpenAdd = () => {
    setEditingTitle(null);
    setInputValue('');
    setIsActiveValue(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (jt: any) => {
    setEditingTitle({ id: jt.id, title: jt.title, is_active: jt.is_active });
    setInputValue(jt.title);
    setIsActiveValue(jt.is_active);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    try {
      if (editingTitle) {
        // Update title name
        if (inputValue.trim() !== editingTitle.title) {
          await updateJobTitle({ id: editingTitle.id, title: inputValue.trim() });
        }
        // Update active status if changed
        if (isActiveValue !== editingTitle.is_active) {
          await toggleJobTitleStatus({ id: editingTitle.id, isActive: isActiveValue });
        }
      } else {
        await createJobTitle(inputValue.trim());
        // Note: New titles are active by default in API, but we could enforce isActiveValue here if API supported it in create
      }
      setIsDialogOpen(false);
    } catch (err) {
      // toast handled in hook
    }
  };

  const jobTitleParticipants = useMemo(() => {
    const map: Record<string, any[]> = {};
    
    participants.forEach(p => {
      if (p.job_title_id && p.status === 'active') {
        if (!map[p.job_title_id]) map[p.job_title_id] = [];
        map[p.job_title_id].push(p);
      }
    });
    
    return map;
  }, [participants]);

  const isLoading = isLoadingTitles || isLoadingParticipants;

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading 
            title="Managed Job Titles" 
            description="Manage the list of job titles available within your organisation" 
          />
          <ToolbarActions>
            <Button variant="primary" size="sm" className="rounded-xl h-10 font-bold" onClick={handleOpenAdd}>
              <KeenIcon icon="plus" />
              New Job Title
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card className="border-0 sm:border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest min-w-[150px]">Title</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest min-w-[200px]">Participants</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-muted-foreground">
                        <KeenIcon icon="loading" className="animate-spin text-2xl mb-2" />
                        <p className="font-medium">Loading data...</p>
                      </td>
                    </tr>
                  ) : jobTitles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <KeenIcon icon="coffee" className="text-4xl text-gray-200" />
                          <p className="text-sm font-bold text-gray-400 italic">No job titles have been created yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jobTitles.map((jt) => {
                      const assignedParticipants = jobTitleParticipants[jt.id] || [];
                      
                      return (
                        <tr 
                          key={jt.id} 
                          className={cn(
                            "hover:bg-gray-50/50 transition-colors group cursor-pointer", 
                            !jt.is_active && "bg-gray-50/30"
                          )}
                          onClick={() => handleOpenEdit(jt)}
                        >
                          <td className="py-5 px-6">
                            <span className={cn("text-gray-900 font-medium", !jt.is_active && "text-gray-400")}>{jt.title}</span>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto kt-scrollable-y-hover pr-2">
                              {assignedParticipants.length > 0 ? (
                                assignedParticipants.map((p) => (
                                  <div key={p.id} className="flex items-center gap-2">
                                    <ProfileAvatar 
                                      userId={p.id} 
                                      currentAvatar={p.avatar_url} 
                                      userName={p.full_name} 
                                      size="xs" 
                                    />
                                    <span className="text-[11px] font-bold text-gray-700 truncate">
                                      {p.full_name}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-[10px] text-gray-400 italic">No active participants</span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] font-black uppercase border-none h-5 px-2 rounded-md",
                                jt.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                              )}
                            >
                              {jt.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                mode="icon" 
                                size="sm" 
                                className="size-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(jt);
                                }}
                                title="Edit"
                              >
                                <KeenIcon icon="pencil" className="text-base" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingTitle ? 'Edit Job Title' : 'Add New Job Title'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 uppercase font-bold tracking-wider">
              {editingTitle ? 'Update the job title name and status' : 'Enter a name for the new job title'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="jt-name" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Job Title Name</Label>
              <Input
                id="jt-name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., Consultant, Registrar"
                className="h-11 rounded-xl font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            <div className="flex items-center space-x-3 px-1">
              <Checkbox 
                id="jt-active" 
                checked={isActiveValue} 
                onCheckedChange={(checked) => setIsActiveValue(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="jt-active"
                  className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Active Status
                </Label>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Deactivated titles remain assigned to existing users but cannot be selected for new profiles.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-gray-50/50 p-4 sm:p-6 -mx-6 -mb-6 mt-2 rounded-b-2xl border-t border-gray-100">
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl h-11 font-bold border-gray-200">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!inputValue.trim() || isCreating || isUpdating || isToggling}
                className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
              >
                {(isCreating || isUpdating || isToggling) ? (
                  <KeenIcon icon="loading" className="animate-spin size-4" />
                ) : (
                  editingTitle ? 'Update Title' : 'Create Title'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
