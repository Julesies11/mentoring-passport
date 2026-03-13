import { useState, useEffect } from 'react';
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
import { ImageInput, type ImageInputFile } from '@/components/image-input';
import { KeenIcon } from '@/components/keenicons';
import { X } from 'lucide-react';
import { handleLogoUpload, updateOrganisation, getOrganisationLogoUrl } from '@/lib/api/organisations';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const organisationSchema = z.object({
  name: z.string().min(1, 'Organisation name is required'),
});

type OrganisationFormData = z.infer<typeof organisationSchema>;

interface EditOrganisationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

export function EditOrganisationDialog({
  open,
  onOpenChange,
  organisation,
}: EditOrganisationDialogProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState<ImageInputFile[]>([]);
  const [deleteLogo, setDeleteLogo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<OrganisationFormData>({
    resolver: zodResolver(organisationSchema),
    defaultValues: {
      name: organisation.name,
    },
  });

  useEffect(() => {
    if (open && organisation) {
      setValue('name', organisation.name);
      
      // Initialize logo for ImageInput
      if (organisation.logo_url) {
        setLogo([{ dataURL: getOrganisationLogoUrl(organisation.id, organisation.logo_url) }]);
      } else {
        setLogo([]);
      }
      setDeleteLogo(false);
    }
  }, [open, organisation, setValue]);

  const handleFormSubmit = async (data: OrganisationFormData) => {
    setIsLoading(true);
    try {
      const finalLogoUrl = await handleLogoUpload(
        organisation.id,
        logo.length > 0 ? logo[0].file : null,
        deleteLogo,
        organisation.logo_url
      );

      await updateOrganisation(organisation.id, {
        name: data.name,
        logo_url: finalLogoUrl as string | null,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['organisation', organisation.id] });
      queryClient.invalidateQueries({ queryKey: ['active-organisation'] });
      
      toast.success('Organisation updated successfully');
      onOpenChange(false);
      
      // Some components might still need a reload if they don't use the same query keys
      // but we try to avoid it. If needed, the parent can handle it via onOpenChange(false)
    } catch (error) {
      console.error('Error updating organisation:', error);
      toast.error('Failed to update organisation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organisation</DialogTitle>
          <DialogDescription>
            Update your organisation's name and branding logo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
          {/* Logo Section */}
          <div className="flex flex-col items-center space-y-4">
            <Label className="text-gray-900 font-semibold self-start">Branding Logo</Label>
            <div className="relative group">
              <ImageInput
                value={logo}
                onChange={(selectedLogo) => {
                  setLogo(selectedLogo);
                  setDeleteLogo(selectedLogo.length === 0);
                }}
              >
                {({ onImageUpload }) => (
                  <div
                    className="size-32 relative cursor-pointer group rounded-2xl border-4 border-gray-100 group-hover:border-primary transition-all overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm p-4"
                    onClick={onImageUpload}
                  >
                    {logo.length > 0 ? (
                      <img src={logo[0].dataURL} alt="logo" className="size-full object-contain" />
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center">
                        <KeenIcon icon="picture" className="text-5xl" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 py-2 text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Change Logo
                    </div>
                  </div>
                )}
              </ImageInput>
              {logo.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  mode="icon"
                  className="size-8 absolute -top-1 -right-1 rounded-full bg-white shadow-md border-gray-200 text-gray-500 hover:text-danger hover:border-danger transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogo([]);
                    setDeleteLogo(true);
                  }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">
              Click the logo to upload a new one. PNG, JPG or SVG accepted.
            </p>
          </div>

          {/* Name Section */}
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-gray-900 font-semibold">Organisation Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. Fiona Stanley Hospital"
              className={errors.name ? 'border-danger' : ''}
            />
            {errors.name && (
              <p className="text-xs text-danger font-medium">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl flex-1 shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</>
              ) : (
                <><KeenIcon icon="check" className="mr-2" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
