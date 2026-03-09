import { useState, useMemo, useEffect } from 'react';

interface UsePaginationProps<T> {
  items: T[];
  initialItemsPerPage?: number;
  resetDeps?: any[]; // Dependencies that trigger reset to Page 1 (e.g. search/filters)
}

export function usePagination<T>({ 
  items, 
  initialItemsPerPage = 25,
  resetDeps = [] 
}: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Total pages calculation
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage) || 1;
  }, [items.length, itemsPerPage]);

  // Reset to page 1 when filters or items per page change
  // We exclude currentPage from deps to avoid the infinite loop bug
  useEffect(() => {
    setCurrentPage(1);
  }, [...resetDeps, itemsPerPage]);

  // Get current slice of items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, currentPage, itemsPerPage]);

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages));

  return {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
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
