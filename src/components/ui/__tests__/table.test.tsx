import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../table';

describe('Table', () => {
  it('renders correctly with all sub-components', () => {
    render(
      <Table>
        <TableCaption>Invoice List</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV001</TableCell>
            <TableCell>Paid</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/invoice list/i)).toBeInTheDocument();
    expect(screen.getByText(/inv001/i)).toBeInTheDocument();
    expect(screen.getByText(/paid/i)).toBeInTheDocument();
    expect(screen.getByText(/total/i)).toBeInTheDocument();
  });

  it('applies custom classes', () => {
    render(
      <Table className="custom-table">
        <TableBody>
          <TableRow className="custom-row">
            <TableCell className="custom-cell">Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    
    expect(screen.getByRole('table')).toHaveClass('custom-table');
    const row = screen.getByRole('row');
    expect(row).toHaveClass('custom-row');
    const cell = screen.getByRole('cell');
    expect(cell).toHaveClass('custom-cell');
  });
});
