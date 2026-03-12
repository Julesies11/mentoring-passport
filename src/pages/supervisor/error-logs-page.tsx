import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchErrorLogs, clearAllErrorLogs, type ErrorLog } from '@/lib/api/error-logs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/use-pagination';
import { DataTablePagination } from '@/components/common/data-table-pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SupervisorErrorLogsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['error-logs'],
    queryFn: fetchErrorLogs,
  });

  const clearLogsMutation = useMutation({
    mutationFn: clearAllErrorLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      toast.success('Error logs cleared');
    },
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.component_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    goToNextPage,
    goToPrevPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination({
    items: filteredLogs,
    initialItemsPerPage: 50,
    resetDeps: [searchTerm]
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'error': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="System Error Logs"
            description="Monitor and troubleshoot application failures"
          />
          <ToolbarActions>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
              onClick={() => {
                if (confirm('Are you sure you want to delete ALL error logs?')) {
                  clearLogsMutation.mutate();
                }
              }}
              disabled={logs.length === 0 || clearLogsMutation.isPending}
            >
              <KeenIcon icon="trash" className="mr-2" />
              Clear All Logs
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card>
          <CardHeader>
            <CardTitle>Error History</CardTitle>
            <CardToolbar>
              <div className="relative">
                <KeenIcon icon="magnifier" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  className="pl-9 w-full sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardToolbar>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[150px]">Component</TableHead>
                    <TableHead className="w-[150px]">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <KeenIcon icon="loading" className="animate-spin text-2xl text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-gray-500 italic">
                        No error logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-xs font-medium text-gray-500">
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("uppercase text-[9px] font-black h-5 border-none", getSeverityColor(log.severity))}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm font-bold text-gray-900 truncate">{log.message}</p>
                          <p className="text-[10px] text-gray-400 truncate">{log.url}</p>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-primary uppercase tracking-tighter">
                          {log.component_name || 'unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-gray-700 truncate">
                              {log.profiles?.full_name || 'Guest'}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {log.profiles?.email || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onItemsPerPageChange={setItemsPerPage}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
          />
        </Card>
      </Container>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col p-0 rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Badge className={cn("uppercase text-[10px] font-black px-3 h-6 border-none", selectedLog ? getSeverityColor(selectedLog.severity) : '')}>
                {selectedLog?.severity}
              </Badge>
              <span className="text-xs font-medium text-gray-400">
                {selectedLog && format(new Date(selectedLog.created_at), 'MMMM d, yyyy • HH:mm:ss')}
              </span>
            </div>
            <DialogTitle className="text-xl font-black text-gray-900 leading-tight">
              Error Details
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Message</h4>
              <div className="p-4 rounded-xl bg-red-50 text-red-900 text-sm font-bold border border-red-100">
                {selectedLog?.message}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Component</h4>
                <p className="text-sm font-bold text-gray-700">{selectedLog?.component_name || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">User</h4>
                <p className="text-sm font-bold text-gray-700">{selectedLog?.profiles?.full_name || 'Guest'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">URL</h4>
              <p className="text-xs font-mono text-primary break-all">{selectedLog?.url}</p>
            </div>

            {selectedLog?.stack && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Stack Trace</h4>
                <div className="p-4 rounded-xl bg-gray-900 text-gray-300 text-[10px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                  {selectedLog.stack}
                </div>
              </div>
            )}

            {selectedLog?.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Metadata</h4>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <pre className="text-[10px] text-gray-600 font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
            <Button variant="primary" onClick={() => setSelectedLog(null)} className="rounded-xl font-bold px-8">
              Dismiss
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
