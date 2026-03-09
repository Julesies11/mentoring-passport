import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTablePagination } from '../data-table-pagination';
import { render } from '@/test/utils';

describe('DataTablePagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 45,
    itemsPerPage: 10,
    startIndex: 1,
    endIndex: 10,
    onItemsPerPageChange: vi.fn(),
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
  };

  it('renders information text correctly', () => {
    render(<DataTablePagination {...defaultProps} />);
    
    expect(screen.getByText(/showing 1 to 10 of 45/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<DataTablePagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByTestId('keen-icon-black-left').closest('button');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<DataTablePagination {...defaultProps} currentPage={5} totalPages={5} />);
    
    const nextButton = screen.getByTestId('keen-icon-black-right').closest('button');
    expect(nextButton).toBeDisabled();
  });

  it('calls navigation functions when buttons are clicked', () => {
    const onNextPage = vi.fn();
    const onPrevPage = vi.fn();
    
    render(<DataTablePagination {...defaultProps} currentPage={2} onNextPage={onNextPage} onPrevPage={onPrevPage} />);
    
    const nextButton = screen.getByTestId('keen-icon-black-right').closest('button');
    const prevButton = screen.getByTestId('keen-icon-black-left').closest('button');
    
    fireEvent.click(nextButton!);
    expect(onNextPage).toHaveBeenCalled();
    
    fireEvent.click(prevButton!);
    expect(onPrevPage).toHaveBeenCalled();
  });

  it('calls onItemsPerPageChange when selector changes', () => {
    const onItemsPerPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} onItemsPerPageChange={onItemsPerPageChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '25' } });
    
    expect(onItemsPerPageChange).toHaveBeenCalledWith(25);
  });

  it('returns null if totalItems is 0', () => {
    const { container } = render(<DataTablePagination {...defaultProps} totalItems={0} />);
    expect(container.firstChild).toBeNull();
  });
});
