import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Search, UserPlus, Check, X, Building2, User } from 'lucide-react';
import type { Organisation } from '@/lib/api/organisations';
import { 
  Stepper, 
  StepperItem, 
  StepperTrigger, 
  StepperIndicator, 
  StepperSeparator, 
  StepperTitle, 
  StepperNav,
} from '@/components/ui/stepper';
import { ImageInput, ImageInputFile } from '@/components/image-input';
import { searchUsers } from '@/lib/api/profiles';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { handleLogoUpload } from '@/lib/api/organisations';
import { OrganisationLogo } from '@/components/common/organisation-logo';

const setupOrganisationSchema = z.object({
  orgName: z.string().min(1, 'Organisation name is required'),
  orgLogoUrl: z.string().nullable().optional(),
  adminMode: z.enum(['new', 'existing']),
  // Fields for 'new' mode
  adminName: z.string().optional(),
  adminEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  // Fields for 'existing' mode
  adminUserId: z.string().optional(),
  // For update mode
  name: z.string().optional(),
  logo_url: z.string().nullable().optional(),
}).refine((data) => {
  if (data.adminMode === 'new') {
    return !!data.adminName && !!data.adminEmail && !!data.adminPassword;
  }
  return !!data.adminUserId || !!data.name; // name exists in edit mode
}, {
  message: "Admin details are required",
  path: ["adminMode"]
});

const updateOrganisationSchema = z.object({
  name: z.string().min(1, 'Organisation name is required'),
  logo_url: z.string().nullable().optional(),
  orgName: z.string().optional(),
  orgLogoUrl: z.string().nullable().optional(),
  adminMode: z.any().optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPassword: z.string().optional(),
  adminUserId: z.string().optional(),
});

interface OrganisationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation?: Organisation | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function OrganisationDialog({
  open,
  onOpenChange,
  organisation,
  onSubmit,
  isLoading,
}: OrganisationDialogProps) {
  const isEdit = !!organisation;
  const [activeStep, setActiveStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [logoFiles, setLogoFiles] = useState<ImageInputFile[]>([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm<any>({
    resolver: zodResolver(isEdit ? updateOrganisationSchema : setupOrganisationSchema),
    defaultValues: {
      orgName: '',
      orgLogoUrl: '',
      adminMode: 'existing', // Default to Search Existing
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      adminUserId: '',
      name: '',
      logo_url: '',
    },
  });

  const adminMode = watch('adminMode');
  const orgName = watch('orgName');

  // Search existing users (also fetches all if search is empty)
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['admin-user-search', userSearch],
    queryFn: () => searchUsers(userSearch),
    enabled: open && activeStep === 2 && adminMode === 'existing',
  });

  useEffect(() => {
    if (open) {
      if (organisation && isEdit) {
        reset({
          name: organisation.name || '',
          logo_url: organisation.logo_url || '',
          orgName: '',
          orgLogoUrl: '',
          adminMode: 'existing',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          adminUserId: '',
        });
        if (organisation.logo_url) {
          setLogoFiles([{ dataURL: organisation.logo_url }]);
        } else {
          setLogoFiles([]);
        }
      } else {
        reset({
          orgName: '',
          orgLogoUrl: '',
          adminMode: 'existing',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          adminUserId: '',
          name: '',
          logo_url: '',
        });
        setLogoFiles([]);
      }
      setActiveStep(1);
      setSelectedUser(null);
      setUserSearch('');
    }
  }, [organisation, isEdit, reset, open]);

  const handleNextStep = async () => {
    const fieldsToValidate = activeStep === 1 
      ? (isEdit ? ['name'] : ['orgName']) 
      : [];
    
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setActiveStep(2);
    }
  };

  const handleLogoChange = async (files: ImageInputFile[]) => {
    setLogoFiles(files);
    if (files.length > 0 && files[0].file) {
      setIsUploadingLogo(true);
      try {
        const file = files[0].file;
        const fileName = await handleLogoUpload(organisation?.id || 'temp', file);
        
        if (fileName) {
          setValue(isEdit ? 'logo_url' : 'orgLogoUrl', fileName);
        }
      } catch (err) {
        console.error('Logo upload failed:', err);
        setError('Failed to upload logo');
      } finally {
        setIsUploadingLogo(false);
      }
    } else if (files.length === 0) {
      setValue(isEdit ? 'logo_url' : 'orgLogoUrl', '');
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setError(null);
      
      // Map form data to API input
      const apiData = isEdit ? {
        name: data.name,
        logo_url: data.logo_url
      } : {
        orgName: data.orgName,
        orgLogoUrl: data.orgLogoUrl,
        adminMode: data.adminMode,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        adminUserId: selectedUser?.id,
      };

      await onSubmit(apiData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setValue('adminUserId', user.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[650px] w-[calc(100%-32px)] sm:w-full max-h-[90dvh] p-0 overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 sm:p-6 pb-4 shrink-0 border-b border-gray-100 bg-gray-50/30">
          <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight">
            {isEdit ? 'Update Organisation' : 'New Organisation Wizard'}
          </DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 tracking-wider">
            {isEdit
              ? 'Update hospital branding and details'
              : 'Complete the steps below to setup a new mentoring entity'}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="px-4 sm:px-8 py-4 border-b border-gray-100 bg-white">
            <Stepper value={activeStep}>
              <StepperNav>
                <StepperItem step={1}>
                  <StepperTrigger className="flex-col gap-1 items-start">
                    <div className="flex items-center gap-2">
                      <StepperIndicator className="size-5 text-[10px] font-bold">1</StepperIndicator>
                      <StepperTitle className="text-[11px] font-black uppercase tracking-widest leading-none">Entity Details</StepperTitle>
                    </div>
                  </StepperTrigger>
                </StepperItem>
                <StepperSeparator className="mx-4" />
                <StepperItem step={2}>
                  <StepperTrigger className="flex-col gap-1 items-start">
                    <div className="flex items-center gap-2">
                      <StepperIndicator className="size-5 text-[10px] font-bold">2</StepperIndicator>
                      <StepperTitle className="text-[11px] font-black uppercase tracking-widest leading-none">Assign Admin</StepperTitle>
                    </div>
                  </StepperTrigger>
                </StepperItem>
              </StepperNav>
            </Stepper>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 mb-6 flex items-center gap-3">
              <div className="size-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
              {error}
            </div>
          )}

          <form id="organisation-form" onSubmit={handleSubmit(handleFormSubmit)}>
            {/* STEP 1: ORGANISATION DETAILS */}
            {(activeStep === 1 || isEdit) && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="shrink-0 mx-auto sm:mx-0">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 text-center sm:text-left">Brand Logo</Label>
                    
                    <ImageInput
                      value={logoFiles}
                      onChange={handleLogoChange}
                    >
                      {({ onImageUpload, onImageRemoveAll, fileList }) => (
                        <div className="relative group">
                          <div 
                            onClick={onImageUpload}
                            className={cn(
                              "size-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-light/5 transition-all overflow-hidden bg-gray-50",
                              fileList.length > 0 && "border-solid border-primary/20"
                            )}
                          >
                            {isUploadingLogo ? (
                              <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full" />
                            ) : fileList.length > 0 ? (
                              <OrganisationLogo 
                                orgId={organisation?.id || 'temp'} 
                                logoPath={watch(isEdit ? 'logo_url' : 'orgLogoUrl')} 
                                name={watch(isEdit ? 'name' : 'orgName')} 
                                size="xl"
                                className="size-full rounded-2xl"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-400">
                                <Building2 className="size-6" />
                                <span className="text-[8px] font-bold uppercase">Upload</span>
                              </div>
                            )}
                          </div>
                          {fileList.length > 0 && !isUploadingLogo && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onImageRemoveAll(); }}
                              className="absolute -top-2 -right-2 size-6 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-danger transition-colors"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </ImageInput>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={isEdit ? "name" : "orgName"} className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Hospital / Organisation Name *</Label>
                      <Input
                        id={isEdit ? "name" : "orgName"}
                        {...register(isEdit ? 'name' : 'orgName')}
                        placeholder="e.g. Fiona Stanley Hospital"
                        className="h-11 bg-gray-50 border-gray-100 rounded-xl font-bold text-sm focus:bg-white transition-all"
                      />
                      {(isEdit ? errors.name : errors.orgName) && (
                        <p className="text-[10px] text-red-600 font-bold ml-1 uppercase tracking-tight">
                          {(isEdit ? errors.name?.message : errors.orgName?.message) as string}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium italic ml-1 leading-relaxed">
                      This name will be displayed across the platform for all users belonging to this entity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ASSIGN ADMIN (ONLY FOR NEW ORG) */}
            {!isEdit && activeStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setValue('adminMode', 'existing')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      adminMode === 'existing' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Search className="size-3.5" />
                    Search Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('adminMode', 'new')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      adminMode === 'new' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <UserPlus className="size-3.5" />
                    Create New User
                  </button>
                </div>

                {adminMode === 'new' ? (
                  <div className="grid gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="adminName" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name *</Label>
                      <Input
                        id="adminName"
                        {...register('adminName')}
                        placeholder="e.g. Jane Doe"
                        className="h-11 bg-gray-50 border-gray-100 rounded-xl font-bold"
                      />
                      {errors.adminName && (
                        <p className="text-[10px] text-red-600 font-bold ml-1 uppercase tracking-tight">{(errors.adminName.message as string)}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="adminEmail" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        {...register('adminEmail')}
                        placeholder="jane@hospital.com"
                        className="h-11 bg-gray-50 border-gray-100 rounded-xl font-bold"
                      />
                      {errors.adminEmail && (
                        <p className="text-[10px] text-red-600 font-bold ml-1 uppercase tracking-tight">{(errors.adminEmail.message as string)}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="adminPassword" className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Initial Password *</Label>
                      <div className="relative">
                        <Input
                          id="adminPassword"
                          type={showPassword ? "text" : "password"}
                          {...register('adminPassword')}
                          placeholder="Min. 8 characters"
                          className="h-11 pr-10 bg-gray-50 border-gray-100 rounded-xl font-bold"
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="size-4 text-gray-400" /> : <Eye className="size-4 text-gray-400" />}
                        </button>
                      </div>
                      {errors.adminPassword && (
                        <p className="text-[10px] text-red-600 font-bold ml-1 uppercase tracking-tight">{(errors.adminPassword.message as string)}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        placeholder="Search users by name or email..."
                        className="pl-10 h-11 bg-gray-50 border-gray-100 rounded-xl font-bold"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>

                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
                      <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-2.5 text-[9px] font-black uppercase text-gray-400 tracking-widest">User</th>
                              <th className="px-4 py-2.5 text-[9px] font-black uppercase text-gray-400 tracking-widest">Email</th>
                              <th className="px-4 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {isSearching ? (
                              <tr>
                                <td colSpan={3} className="py-12 text-center">
                                  <div className="animate-spin size-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                </td>
                              </tr>
                            ) : searchResults.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="py-12 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">
                                  {userSearch.length > 0 ? 'No users matching your search' : 'No users available'}
                                </td>
                              </tr>
                            ) : (
                              searchResults.map((user) => (
                                <tr 
                                  key={user.id}
                                  onClick={() => handleSelectUser(user)}
                                  className={cn(
                                    "group cursor-pointer transition-colors",
                                    selectedUser?.id === user.id ? "bg-primary-light/20" : "hover:bg-gray-50"
                                  )}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="size-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                        <User className="size-4" />
                                      </div>
                                      <span className={cn(
                                        "text-xs font-black uppercase tracking-tight",
                                        selectedUser?.id === user.id ? "text-primary" : "text-gray-700"
                                      )}>
                                        {user.full_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-[10px] font-bold text-gray-500">{user.email}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className={cn(
                                      "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                                      selectedUser?.id === user.id 
                                        ? "bg-primary border-primary" 
                                        : "border-gray-200 group-hover:border-primary/30"
                                    )}>
                                      {selectedUser?.id === user.id && <Check className="size-3 text-white" />}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {errors.adminMode && !selectedUser && (
                      <p className="text-[10px] text-red-600 font-bold ml-1 uppercase tracking-tight text-center">Please select a user to proceed</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="flex-1">
            {activeStep === 2 && !isEdit && (
              <Button 
                variant="outline" 
                onClick={() => setActiveStep(1)}
                className="h-11 px-6 font-bold rounded-xl w-full sm:w-auto text-[10px] uppercase tracking-widest"
              >
                Back to Details
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="h-11 px-6 font-bold rounded-xl w-full sm:w-auto text-[10px] uppercase tracking-widest border-gray-200"
            >
              Cancel
            </Button>
            
            {!isEdit && activeStep === 1 ? (
              <Button 
                onClick={handleNextStep}
                disabled={!orgName}
                className="h-11 px-10 font-black rounded-xl w-full sm:w-auto text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                Next: Assign Admin
              </Button>
            ) : (
              <Button 
                type="submit" 
                form="organisation-form"
                disabled={isLoading || isUploadingLogo || (!isEdit && activeStep === 2 && adminMode === 'existing' && !selectedUser)} 
                className="h-11 px-10 font-black rounded-xl w-full sm:w-auto text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                {isLoading ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Entity'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
