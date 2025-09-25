import * as React from "react";
import { cn } from "./utils";

interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DataTable = ({ className, children, ...props }: DataTableProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-enterprise-sm",
        className
      )}
      {...props}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
};

interface DataTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const DataTableHeader = ({ className, children, ...props }: DataTableHeaderProps) => {
  return (
    <thead
      className={cn("sticky top-0 z-10 bg-muted/50", className)}
      {...props}
    >
      {children}
    </thead>
  );
};

interface DataTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const DataTableBody = ({ className, children, ...props }: DataTableBodyProps) => {
  return (
    <tbody
      className={cn("divide-y divide-border", className)}
      {...props}
    >
      {children}
    </tbody>
  );
};

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const DataTableRow = ({ className, children, ...props }: DataTableRowProps) => {
  return (
    <tr
      className={cn(
        "hover:bg-muted/50 transition-colors duration-150 ease-pleasant",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

interface DataTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const DataTableHead = ({ className, children, ...props }: DataTableHeadProps) => {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const DataTableCell = ({ className, children, ...props }: DataTableCellProps) => {
  return (
    <td
      className={cn("px-4 py-3 text-sm", className)}
      {...props}
    >
      {children}
    </td>
  );
};

export {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
};
