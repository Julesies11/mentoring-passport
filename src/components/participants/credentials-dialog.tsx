import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
  name: string;
  role: string;
}

export function CredentialsDialog({
  open,
  onOpenChange,
  email,
  password,
  name,
  role,
}: CredentialsDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const loginUrl = `${window.location.origin}/auth/signin`;
    const text = `Mentoring Passport - New Account Created

Name: ${name}
Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Email (Username): ${email}
Temporary Password: ${password}

Login URL: ${loginUrl}

IMPORTANT: You will be required to change your password on first login.

Please keep these credentials secure.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Participant Created Successfully</DialogTitle>
          <DialogDescription>
            Copy these credentials and share them with the participant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <div className="text-sm font-medium text-gray-700">Name:</div>
              <div className="text-sm font-semibold">{name}</div>

              <div className="text-sm font-medium text-gray-700">Role:</div>
              <div className="text-sm font-semibold capitalize">{role}</div>

              <div className="text-sm font-medium text-gray-700">Email:</div>
              <div className="text-sm font-mono break-all">{email}</div>

              <div className="text-sm font-medium text-gray-700">Password:</div>
              <div className="text-sm font-mono break-all">{password}</div>

              <div className="text-sm font-medium text-gray-700">Login URL:</div>
              <div className="text-sm text-blue-600 break-all">
                {window.location.origin}/auth/signin
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-yellow-900">Important Notes:</p>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>This is a temporary password</li>
                  <li>User will be required to change password on first login</li>
                  <li>Copy these credentials now - they won't be shown again</li>
                </ul>
              </div>
            </div>
          </div>

          <Button onClick={copyToClipboard} className="w-full" size="lg">
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy All Credentials
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
