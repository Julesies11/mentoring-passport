import { Fragment, useState } from 'react';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { ParticipantsContent } from './components/participants-content';
import { CreateParticipantDialog } from '@/components/participants/participant-dialog-create';
import { useParticipants } from '@/hooks/use-participants';
import { CredentialsDialog } from '@/components/participants/credentials-dialog';
import { supabase } from '@/lib/supabase';
import type { CreateParticipantInput } from '@/lib/api/participants';

export function ParticipantsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { createParticipant, isCreating } = useParticipants();
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', name: '', role: '' });

  const handleCreate = async (data: CreateParticipantInput & { avatar_file?: File }) => {
    let avatarUrl = undefined;

    // Handle avatar upload if a file was selected
    if (data.avatar_file) {
      try {
        const file = data.avatar_file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `temp/${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('mp-avatars')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('mp-avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading avatar:', error);
        // Continue without avatar if upload fails
      }
    }

    // Clean up internal field before API call
    const { avatar_file, ...apiData } = data;
    await createParticipant({ ...apiData, avatar_url: avatarUrl });
    
    setNewCredentials({
      email: data.email,
      password: data.password,
      name: data.full_name || data.email,
      role: data.role,
    });
    setShowCredentials(true);
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Participants"
            description="Manage mentors, mentees, and supervisors"
          />
          <ToolbarActions>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <KeenIcon icon="user-tick" />
              Add Participant
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <ParticipantsContent />
      </Container>

      <CreateParticipantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
      />

      <CredentialsDialog
        open={showCredentials}
        onOpenChange={setShowCredentials}
        email={newCredentials.email}
        password={newCredentials.password}
        name={newCredentials.name}
        role={newCredentials.role}
      />
    </Fragment>
  );
}
