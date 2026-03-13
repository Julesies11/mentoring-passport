import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';

import { Card, CardContent } from '@/components/ui/card';

const CheckEmail = () => {
  return (
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="p-6 lg:p-8">
        <div className="flex justify-center py-10">
          <img
            src={toAbsoluteUrl('/media/illustrations/30.svg')}
            className="dark:hidden max-h-[130px]"
            alt=""
          />
          <img
            src={toAbsoluteUrl('/media/illustrations/30-dark.svg')}
            className="light:hidden max-h-[130px]"
            alt=""
          />
        </div>

        <h3 className="text-xl font-bold text-gray-900 text-center mb-3 uppercase tracking-widest">
          Check your email
        </h3>
        <div className="text-sm text-center text-muted-foreground mb-7.5 leading-relaxed font-bold uppercase tracking-tight">
          Please click the link sent to your email&nbsp;
          <a
            href="#"
            className="text-primary hover:underline"
          >
            your@email.com
          </a>
          <br />
          to verify your account.
        </div>

        <div className="flex justify-center mb-5">
          <Link to="/" className="btn btn-primary flex justify-center w-full h-11 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            Back to Home
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1 mt-4">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-tight">
            Didn’t receive an email?
          </span>
          <Link
            to="/auth/signin"
            className="text-xs font-bold text-primary hover:underline"
          >
            Resend
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export { CheckEmail };
