import { useState } from 'react';
import { MoveLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent } from '@/components/ui/card';

const TwoFactorAuth = () => {
  const [codeInputs, setCodeInputs] = useState(Array(6).fill(''));

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const updatedInputs = [...codeInputs];
    updatedInputs[index] = value;
    setCodeInputs(updatedInputs);
  };

  return (
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="flex flex-col gap-5 p-10">
        <img
          src={toAbsoluteUrl('/media/illustrations/34.svg')}
          className="dark:hidden h-20 mb-2"
          alt=""
        />
        <img
          src={toAbsoluteUrl('/media/illustrations/34-dark.svg')}
          className="light:hidden h-20 mb-2"
          alt=""
        />

        <div className="text-center mb-2">
          <h3 className="text-lg font-medium text-mono mb-5 uppercase tracking-widest text-gray-900">
            Verify your phone
          </h3>
          <div className="flex flex-col">
            <span className="text-sm text-secondary-foreground mb-1.5 font-bold uppercase tracking-tight">
              Enter the verification code we sent to
            </span>
            <a href="#" className="text-sm font-bold text-gray-900">
              ****** 7859
            </a>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 font-bold">
          {codeInputs.map((value, index) => (
            <Input
              key={index}
              type="text"
              maxLength={1}
              className="size-10 shrink-0 px-0 text-center rounded-xl"
              value={value}
              onChange={(e) => handleInputChange(index, e.target.value)}
            />
          ))}
        </div>

        <div className="flex items-center justify-center mb-2">
          <span className="text-xs text-muted-foreground me-1.5 font-bold uppercase tracking-tight">
            Didn’t receive a code? (37s)
          </span>
          <Link
            to="/auth/signin"
            className="text-xs font-bold text-primary hover:underline"
          >
            Resend
          </Link>
        </div>

        <Button className="h-11 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">Continue</Button>

        <Link
          to="/auth/signin"
          className="gap-2.5 flex items-center justify-center text-xs font-bold text-gray-500 hover:text-primary transition-colors uppercase tracking-widest mt-2"
        >
          <MoveLeft className="size-3.5 opacity-70" />
          Back to Login
        </Link>
      </CardContent>
    </Card>
  );
};

export { TwoFactorAuth };
