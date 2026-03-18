import { useQuery } from '@tanstack/react-query';
import { fetchInstanceStats } from '@/lib/api/organisations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { Link } from 'react-router-dom';

export function AdminDashboardContent() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-instance-stats'],
    queryFn: fetchInstanceStats
  });

  return (
    <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
      {/* 1. Instance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7.5">
        <Card className="border-none shadow-sm bg-success text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="users" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{isLoading ? '...' : stats?.users}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-info text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="layers" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{isLoading ? '...' : stats?.programs}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Total Programs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-warning text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="disconnect" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{isLoading ? '...' : stats?.pairs}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Active Pairings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7.5 items-start">
        {/* System Health */}
        <Card className="lg:col-span-8 shadow-none border border-gray-200">
          <CardHeader className="px-6 py-4 border-b border-gray-100 min-h-0">
            <CardTitle className="text-lg font-bold text-gray-900">System Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="size-2.5 rounded-full bg-success"></div>
                    <span className="font-bold text-gray-700 uppercase tracking-tight text-xs">Database Engine</span>
                  </div>
                  <Badge variant="success" className="font-black text-[10px] uppercase">Healthy</Badge>
               </div>
               
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="size-2.5 rounded-full bg-success"></div>
                    <span className="font-bold text-gray-700 uppercase tracking-tight text-xs">Auth Service</span>
                  </div>
                  <Badge variant="success" className="font-black text-[10px] uppercase">Online</Badge>
               </div>

               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="size-2.5 rounded-full bg-success"></div>
                    <span className="font-bold text-gray-700 uppercase tracking-tight text-xs">Cloud Storage</span>
                  </div>
                  <Badge variant="success" className="font-black text-[10px] uppercase">Operational</Badge>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-4 shadow-none border border-gray-200">
          <CardHeader className="px-6 py-4 border-b border-gray-100 min-h-0">
            <CardTitle className="text-lg font-bold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             <div className="grid gap-3">
               <Link to="/admin/programs" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                 <div className="size-10 rounded-lg bg-primary-light flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                   <KeenIcon icon="layers" />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold text-gray-800 text-sm">Programs</span>
                   <span className="text-[10px] text-gray-500 font-medium">Manage cohorts</span>
                 </div>
               </Link>

               <Link to="/admin/participants" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                 <div className="size-10 rounded-lg bg-success-light flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                   <KeenIcon icon="users" />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold text-gray-800 text-sm">Members</span>
                   <span className="text-[10px] text-gray-500 font-medium">Manage all profiles</span>
                 </div>
               </Link>

               <Link to="/admin/task-templates" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                 <div className="size-10 rounded-lg bg-info-light flex items-center justify-center text-info group-hover:scale-110 transition-transform">
                   <KeenIcon icon="check-squared" />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold text-gray-800 text-sm">Curriculum</span>
                   <span className="text-[10px] text-gray-500 font-medium">Master task lists</span>
                 </div>
               </Link>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
