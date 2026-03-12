import { useEffect, useState } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeenIcon } from '@/components/keenicons';
import { useMutation } from '@tanstack/react-query';
import { updateOrganisation } from '@/lib/api/organisations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const orgSchema = z.object({
  name: z.string().min(1, 'Organisation name is required'),
});

type OrgFormData = z.infer<typeof orgSchema>;

export function OrganisationSettingsPage() {
  const { activeOrganisation, isLoading, refreshOrganisation } = useOrganisation();
  const [isProcessingOrg, setIsProcessingOrg] = useState(false);

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

  if (isLoading) return <div className="p-10 text-center font-bold text-gray-500">Loading settings...</div>;

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading 
            title="Organisation Settings" 
            description="Control your organisation profile and general configuration" 
          />
        </Toolbar>
      </Container>

      <Container className="flex flex-col gap-5 lg:gap-7.5 mt-5">
        <Card className="border-0 sm:border">
          <CardContent className="p-3 sm:p-6">
            <form onSubmit={handleSubmit((data) => updateOrgMutation.mutate(data))} className="max-w-2xl space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-black uppercase text-gray-500 tracking-widest">Organisation Name</Label>
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
      </Container>
    </>
  );
}
