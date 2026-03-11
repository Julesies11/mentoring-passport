import { useState, useMemo, useCallback } from 'react';

interface UsePaginationProps<T> {
  items: T[];
  initialItemsPerPage?: number;
}

export function usePagination<T>({ 
  items, 
  initialItemsPerPage = 25
}: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Total pages calculation
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage) || 1;
  }, [items.length, itemsPerPage]);

  // Get current slice of items
  const paginatedItems = useMemo(() => {
    // Safety check: if current page is beyond total pages (e.g. after filtering)
    // we return the last page's worth of items, but we don't trigger a state update
    // here to avoid render loops. Components should call goToPage(1) when filtering.
    const effectivePage = Math.min(currentPage, totalPages);
    const start = (effectivePage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, currentPage, itemsPerPage, totalPages]);

  const goToNextPage = useCallback(() => setCurrentPage(prev => Math.min(prev + 1, totalPages)), [totalPages]);
  const goToPrevPage = useCallback(() => setCurrentPage(prev => Math.max(prev - 1, 1)), []);
  const goToPage = useCallback((page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages)), [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    itemsPerPage,
    setItemsPerPage: setPageSize,
    totalPages,
    paginatedItems,
    goToNextPage,
    goToPrevPage,
    goToPage,
    totalItems: items.length,
    startIndex: (currentPage - 1) * itemsPerPage + 1,
    endIndex: Math.min(currentPage * itemsPerPage, items.length)
  };
}
