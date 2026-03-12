import { useState, useEffect } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { updateOrganisation } from '@/lib/api/organisations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function OrgSettingsContent() {
  const { activeOrganisation, refreshOrganisation } = useOrganisation();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeOrganisation) {
      setName(activeOrganisation.name);
    }
  }, [activeOrganisation]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganisation) return;

    setIsSaving(true);
    try {
      await updateOrganisation(activeOrganisation.id, { name });
      await refreshOrganisation();
      toast.success('Organisation updated successfully');
    } catch (error) {
      toast.error('Failed to update organisation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto">
      <Card className="border-0 sm:border">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <CardTitle className="text-lg font-bold">General Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="org-name" className="text-[11px] font-black uppercase text-gray-500 tracking-widest ml-1">Hospital Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organisation name"
                className="h-11 bg-gray-50 border-gray-100 rounded-xl font-bold text-gray-900"
                required
              />
              <p className="text-[10px] text-gray-400 ml-1">This name will be visible to all members of this hospital.</p>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={isSaving || name === activeOrganisation?.name}
                className="h-11 px-8 rounded-xl font-bold uppercase text-xs"
              >
                {isSaving ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
