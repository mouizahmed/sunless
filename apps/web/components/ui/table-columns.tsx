"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SortableHeaderProps {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
  title: string;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({ column, title, className = "" }) => {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={`h-auto p-0 font-medium ${className}`}
    >
      {title}
      {sorted === "desc" ? (
        <ChevronDown className="ml-1 h-3 w-3" />
      ) : sorted === "asc" ? (
        <ChevronUp className="ml-1 h-3 w-3" />
      ) : (
        <ChevronsUpDown className="ml-1 h-3 w-3" />
      )}
    </Button>
  );
};

export interface ActionMenuItem<T = unknown> {
  label: string;
  onClick: (item: T) => void;
  className?: string;
  disabled?: (item: T) => boolean;
  render?: (item: T) => React.ReactNode;
}

// Reusable actions dropdown component
interface ActionsDropdownProps<T> {
  item: T;
  actions: ActionMenuItem<T>[];
  className?: string;
}

export function ActionsDropdown<T>({ item, actions, className = "w-32" }: ActionsDropdownProps<T>) {
  return (
    <div className="flex justify-end">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          sideOffset={5} 
          alignOffset={-5} 
          className={className}
          avoidCollisions={true}
        >
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              className={action.className}
              onClick={() => action.onClick(item)}
              disabled={action.disabled?.(item)}
            >
              {action.render ? action.render(item) : action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Reusable editable cell component
interface EditableCellProps {
  isEditing: boolean;
  value: string;
  displayValue?: string | React.ReactNode;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  maxLength?: number;
  placeholder?: string;
  type?: "text" | "number";
}

export const EditableCell: React.FC<EditableCellProps> = ({
  isEditing,
  value,
  displayValue,
  onChange,
  onSave,
  onCancel,
  maxLength,
  placeholder,
  type = "text"
}) => {
  if (isEditing) {
    return (
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full"
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus
      />
    );
  }

  return <span>{displayValue || value}</span>;
};

// Editable cell with save/cancel buttons
interface EditableCellWithActionsProps extends EditableCellProps {
  showActions: boolean;
}

export const EditableCellWithActions: React.FC<EditableCellWithActionsProps> = ({
  showActions,
  ...allProps
}) => {
  if (showActions) {
    return (
      <div className="space-y-2">
        <EditableCell {...allProps} />
        <div className="flex space-x-2">
          <Button size="sm" onClick={allProps.onSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={allProps.onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return <EditableCell {...allProps} />;
};

// Column factory functions
export const createSortableColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  cellRenderer?: (value: unknown, item: T) => React.ReactNode
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header: ({ column }) => <SortableHeader column={column} title={header} />,
  cell: ({ row, getValue }) => {
    const value = getValue();
    const item = row.original;
    return cellRenderer ? cellRenderer(value, item) : <span className="text-muted-foreground">{String(value)}</span>;
  },
});

export const createTextColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  cellRenderer?: (value: unknown, item: T) => React.ReactNode
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ row, getValue }) => {
    const value = getValue();
    const item = row.original;
    return cellRenderer ? cellRenderer(value, item) : <span className="font-medium">{String(value)}</span>;
  },
});

export const createActionsColumn = <T,>(
  actions: ActionMenuItem<T>[] | ((item: T) => ActionMenuItem<T>[]),
  className?: string
): ColumnDef<T> => ({
  id: "actions",
  header: () => <div className="text-right">Actions</div>,
  cell: ({ row }) => {
    const item = row.original;
    const resolvedActions = typeof actions === 'function' ? actions(item) : actions;
    return <ActionsDropdown item={item} actions={resolvedActions} className={className} />;
  },
  enableSorting: false,
});

// Enhanced actions column that supports custom rendering (e.g., for editing states)
export const createConditionalActionsColumn = <T,>(
  cellRenderer: (item: T) => React.ReactNode,
): ColumnDef<T> => ({
  id: "actions",
  header: () => <div className="text-right">Actions</div>,
  cell: ({ row }) => cellRenderer(row.original),
  enableSorting: false,
});

export const createDateColumn = <T,>(
  accessorKey: keyof T,
  header: string
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header: ({ column }) => <SortableHeader column={column} title={header} />,
  cell: ({ getValue }) => {
    const date = getValue() as string;
    return <span className="text-muted-foreground">{new Date(date).toLocaleDateString()}</span>;
  },
});

export const createEditableColumn = <T extends { id: string }>(
  accessorKey: keyof T,
  header: string,
  editingItem: T | null,
  editValue: string,
  onEditValueChange: (value: string) => void,
  onSave: () => void,
  onCancel: () => void,
  options?: {
    maxLength?: number;
    type?: "text" | "number";
    sortable?: boolean;
    displayRenderer?: (value: unknown, item: T) => React.ReactNode;
  }
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header: options?.sortable ? ({ column }) => <SortableHeader column={column} title={header} /> : header,
  cell: ({ row, getValue }) => {
    const item = row.original;
    const value = getValue();
    
    return (
      <EditableCell
        isEditing={editingItem?.id === item.id}
        value={editValue}
        displayValue={options?.displayRenderer ? options.displayRenderer(value, item) : <span className="font-medium">{String(value)}</span>}
        onChange={onEditValueChange}
        onSave={onSave}
        onCancel={onCancel}
        maxLength={options?.maxLength}
        type={options?.type}
      />
    );
  },
});

export const createBadgeColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  getBadgeProps: (value: unknown, item: T) => { text: string; className?: string; variant?: string }
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ row, getValue }) => {
    const value = getValue();
    const item = row.original;
    const { text, className } = getBadgeProps(value, item);
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{text}</span>;
  },
  enableSorting: false,
});

export const createSelectColumn = <T,>(): ColumnDef<T> => ({
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && "indeterminate")
      }
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
    />
  ),
  enableSorting: false,
  enableHiding: false,
});

// Link column - displays value as a clickable link
export const createLinkColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  getLinkProps: (value: unknown, item: T) => { href: string; text?: string; className?: string }
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ row, getValue }) => {
    const value = getValue();
    const item = row.original;
    const { href, text, className = "font-medium hover:underline cursor-pointer" } = getLinkProps(value, item);
    
    return (
      <a href={href} className={className}>
        {text || String(value)}
      </a>
    );
  },
});

// Icon column - displays an icon with optional text
export const createIconColumn = <T,>(
  header: string,
  getIconProps: (item: T) => { 
    icon: React.ReactNode; 
    text?: string; 
    className?: string; 
    onClick?: () => void;
  }
): ColumnDef<T> => ({
  id: `icon-${header.toLowerCase()}`,
  header: () => <div className="text-left">{header}</div>,
  cell: ({ row }) => {
    const item = row.original;
    const { icon, text, className = "flex items-center space-x-3", onClick } = getIconProps(item);
    
    const content = (
      <div className={className}>
        <div className="flex-shrink-0">{icon}</div>
        {text && <span className="font-medium">{text}</span>}
      </div>
    );

    return onClick ? (
      <button onClick={onClick} className="text-left hover:underline focus:outline-none w-full">
        {content}
      </button>
    ) : content;
  },
  enableSorting: false,
});

// Status/Badge column - displays colored status badges
export const createStatusColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  getStatusProps: (value: unknown, item: T) => { 
    text: string; 
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'; 
    className?: string;
  }
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ row, getValue }) => {
    const value = getValue();
    const item = row.original;
    const { text, variant = 'default', className = '' } = getStatusProps(value, item);
    
    const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const variantStyles = {
      default: "bg-blue-100 text-blue-800 border-blue-200",
      destructive: "bg-red-100 text-red-800 border-red-200", 
      outline: "bg-gray-100 text-gray-800 border-gray-200",
      secondary: "bg-green-100 text-green-800 border-green-200",
    };
    
    return (
      <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
        {text}
      </span>
    );
  },
  enableSorting: false,
});

// Custom content column - for complex cell content
export const createCustomColumn = <T,>(
  id: string,
  header: string | (() => React.ReactNode),
  cellRenderer: (item: T, value?: unknown) => React.ReactNode,
  options?: {
    accessorKey?: keyof T;
    enableSorting?: boolean;
    width?: number;
    className?: string;
  }
): ColumnDef<T> => ({
  id,
  accessorKey: options?.accessorKey as string,
  header: typeof header === 'function' ? header : header,
  cell: ({ row, getValue }) => {
    const item = row.original;
    const value = options?.accessorKey ? getValue() : undefined;
    return cellRenderer(item, value);
  },
  enableSorting: options?.enableSorting ?? false,
  size: options?.width,
});

// Numeric column - for displaying numbers with formatting
export const createNumericColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  formatOptions?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    placeholder?: string;
    className?: string;
  }
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header: ({ column }) => <SortableHeader column={column} title={header} />,
  cell: ({ getValue }) => {
    const value = getValue() as number;
    const {
      decimals,
      prefix = '',
      suffix = '',
      placeholder = '—',
      className = 'text-muted-foreground'
    } = formatOptions || {};
    
    if (value === null || value === undefined) {
      return <span className={className}>{placeholder}</span>;
    }
    
    let formatted = decimals !== undefined 
      ? value.toFixed(decimals)
      : value.toString();
    
    return (
      <span className={className}>
        {prefix}{formatted}{suffix}
      </span>
    );
  },
});

// Boolean column - for true/false values with custom display
export const createBooleanColumn = <T,>(
  accessorKey: keyof T,
  header: string,
  displayOptions?: {
    trueText?: string;
    falseText?: string;
    trueClassName?: string;
    falseClassName?: string;
    showAsIcon?: boolean;
  }
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
  cell: ({ getValue }) => {
    const value = getValue() as boolean;
    const {
      trueText = 'Yes',
      falseText = 'No',
      trueClassName = 'text-green-600',
      falseClassName = 'text-red-600',
      showAsIcon = false
    } = displayOptions || {};
    
    if (showAsIcon) {
      return value ? (
        <span className={`inline-block w-2 h-2 rounded-full bg-green-500`}></span>
      ) : (
        <span className={`inline-block w-2 h-2 rounded-full bg-red-500`}></span>
      );
    }
    
    return (
      <span className={value ? trueClassName : falseClassName}>
        {value ? trueText : falseText}
      </span>
    );
  },
  enableSorting: false,
});