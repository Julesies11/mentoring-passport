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
  email = '',
  password = '',
  name = '',
  role = '',
}: CredentialsDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const safeRole = role || 'Member';
    const loginUrl = `${window.location.origin}/auth/signin`;
    const text = `Mentoring Passport - New Account Created

Name: ${name || 'N/A'}
Role: ${safeRole.charAt(0).toUpperCase() + safeRole.slice(1)}
Email (Username): ${email}
Temporary Password: ${password}

Login URL: ${loginUrl}

IMPORTANT: You will be required to change your password on first login.

Please keep these credentials secure.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] w-[calc(100%-32px)] sm:w-full max-h-[90dvh] p-0 overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0 border-b border-gray-100">
          <DialogTitle className="text-lg sm:text-xl font-bold text-success flex items-center gap-2">
            <CheckCircle className="size-5" />
            Member Created
          </DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 tracking-wider">
            Copy and share these credentials with the participant
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name:</div>
              <div className="text-sm font-bold text-gray-900 leading-tight">{name || 'N/A'}</div>

              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role:</div>
              <div className="text-sm font-bold text-gray-900 capitalize">{role || 'N/A'}</div>

              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email:</div>
              <div className="text-sm font-mono font-bold text-primary break-all">{email}</div>

              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password:</div>
              <div className="text-sm font-mono font-bold text-gray-900 break-all select-all">{password}</div>

              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Login URL:</div>
              <div className="text-xs font-medium text-gray-500 break-all underline decoration-gray-300">
                {window.location.origin}/auth/signin
              </div>
            </div>
          </div>

          <div className="bg-warning/[0.03] border border-warning/20 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="text-base sm:text-lg">⚠️</span>
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-black text-warning-dark uppercase tracking-widest">Important Notes:</p>
                <ul className="text-[11px] text-gray-600 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                  <li>This is a temporary password</li>
                  <li>User must change password on first login</li>
                  <li>Copy now - they won't be shown again</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 sm:py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
          <Button onClick={copyToClipboard} className="w-full h-11 sm:h-12 font-bold rounded-xl shadow-lg shadow-primary/20" size="lg">
            {copied ? (
              <>
                <CheckCircle className="size-4 mr-2" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="size-4 mr-2" />
                Copy All Credentials
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
