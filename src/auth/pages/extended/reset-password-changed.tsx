import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

const ResetPasswordChanged = () => {
  return (
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="p-6 lg:p-8">
        <div className="flex justify-center mb-5">
          <img
            src={toAbsoluteUrl('/media/illustrations/32.svg')}
            className="dark:hidden max-h-[180px]"
            alt=""
          />
          <img
            src={toAbsoluteUrl('/media/illustrations/32-dark.svg')}
            className="light:hidden max-h-[180px]"
            alt=""
          />
        </div>

        <h3 className="text-xl font-bold text-gray-900 text-center mb-4 uppercase tracking-widest leading-tight">
          Your password is changed
        </h3>
        <div className="text-sm text-center text-muted-foreground mb-7.5 leading-relaxed font-bold uppercase tracking-tight">
          Your password has been successfully updated. Your account's security is
          our priority.
        </div>

        <Button asChild className="w-full h-11 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
          <Link to="/auth/signin">Sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export { ResetPasswordChanged };
