import { Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { HexagonBadge } from '../common/hexagon-badge';
import { IAddNewProps } from './card-add-new-row';

const CardAddNew = ({
  path,
  size,
  iconSize,
  title,
  subTitle,
}: IAddNewProps) => {
  return (
    <Link to={`${path}`}>
      <Card
        className="border-2 border-dashed border-orange-200 bg-center bg-[length:600px] bg-no-repeat h-full"
        style={{
          backgroundImage: `url('${toAbsoluteUrl('/media/images/2600x1200/bg-4.png')}')`,
        }}
      >
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex justify-center pt-5">
              <HexagonBadge
                size={size}
                badge={
                  <Rocket size={16} className={`${iconSize} text-orange-400`} />
                }
                stroke="stroke-orange-200"
                fill="fill-orange-50"
              />
            </div>
            <div className="flex flex-col text-center">
              <span className="text-lg font-medium text-mono hover:text-primary-active mb-px">
                {title}
              </span>
              <span className="text-sm text-secondary-foreground">
                {subTitle}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export { CardAddNew };
