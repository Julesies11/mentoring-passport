import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePagination } from '../use-pagination';

describe('usePagination Hook', () => {
  const mockItems = Array.from({ length: 45 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => usePagination({ items: mockItems }));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.itemsPerPage).toBe(25); // Our new gold standard default
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(25);
    expect(result.current.totalItems).toBe(45);
  });

  it('should calculate correct slice of items', () => {
    const { result } = renderHook(() => usePagination({ items: mockItems, initialItemsPerPage: 10 }));

    expect(result.current.paginatedItems[0].name).toBe('Item 0');
    expect(result.current.paginatedItems).toHaveLength(10);

    act(() => {
      result.current.goToNextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems[0].name).toBe('Item 10');
  });

  it('should not go below page 1 or above total pages', () => {
    const { result } = renderHook(() => usePagination({ items: mockItems, initialItemsPerPage: 25 }));

    act(() => {
      result.current.goToPrevPage();
    });
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.goToNextPage(); // To page 2
      result.current.goToNextPage(); // Attempt page 3 (doesn't exist)
    });
    expect(result.current.currentPage).toBe(2);
  });

  it('should reset to page 1 when dependencies change', () => {
    let searchTerm = '';
    const { result, rerender } = renderHook(
      ({ search }) => usePagination({ items: mockItems, resetDeps: [search], initialItemsPerPage: 10 }),
      { initialProps: { search: '' } }
    );

    act(() => {
      result.current.goToNextPage(); // Now on page 2
    });
    expect(result.current.currentPage).toBe(2);

    // Trigger reset by changing dependency
    rerender({ search: 'new-search' });
    expect(result.current.currentPage).toBe(1);
  });

  it('should update total pages when itemsPerPage changes', () => {
    const { result } = renderHook(() => usePagination({ items: mockItems, initialItemsPerPage: 10 }));
    
    expect(result.current.totalPages).toBe(5);

    act(() => {
      result.current.setItemsPerPage(25);
    });

    expect(result.current.totalPages).toBe(2);
  });
});
