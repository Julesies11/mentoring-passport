import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  onItemsPerPageChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onItemsPerPageChange,
  onPrevPage,
  onNextPage,
}: DataTablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="border-t border-gray-100 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Items per page selector */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest order-2 sm:order-1">
        <span className="hidden xs:inline">Show</span>
        <select 
          className="h-7 sm:h-8 w-[50px] sm:w-[65px] bg-gray-50 border border-gray-200 rounded-lg px-0.5 sm:px-1 outline-none focus:ring-2 focus:ring-primary/20 text-[10px] sm:text-xs font-bold"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="hidden xs:inline">per page</span>
        
        <span className="mx-1 sm:mx-2 text-gray-200 hidden sm:inline">|</span>
        
        <span className="hidden sm:inline">
          Showing {startIndex} to {endIndex} of {totalItems}
        </span>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
        <Button
          variant="outline" size="sm" mode="icon" className="size-7 sm:size-8 rounded-lg border-gray-200"
          onClick={onPrevPage}
          disabled={currentPage === 1}
        >
          <KeenIcon icon="black-left" className="text-xs" data-testid="keen-icon-black-left" />
        </Button>
        
        <div className="flex items-center gap-1.5 mx-1 sm:mx-2">
          <span className="text-[10px] sm:text-xs font-black text-gray-900">{currentPage}</span>
          <span className="text-[10px] sm:text-xs text-gray-300">/</span>
          <span className="text-[10px] sm:text-xs font-black text-gray-900">{totalPages || 1}</span>
        </div>

        <Button
          variant="outline" size="sm" mode="icon" className="size-7 sm:size-8 rounded-lg border-gray-200"
          onClick={onNextPage}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <KeenIcon icon="black-right" className="text-xs" data-testid="keen-icon-black-right" />
        </Button>
      </div>
    </div>
  );
}
