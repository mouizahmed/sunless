"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ActionsDropdown,
  ActionMenuItem,
  createEditableColumn,
  createDateColumn,
  createSelectColumn,
  createStatusColumn,
  createCustomColumn,
  createConditionalActionsColumn,
} from "@/components/ui/table-columns";
import { DataTable, DataTableRef } from "@/components/ui/data-table";
import { GlossaryItem } from "@/types/glossary";
import { useTableEditing } from "@/hooks/use-table-actions";

const getIntensifierColor = (intensifier: number) => {
  if (intensifier < 0) return 'bg-red-100 text-red-800 border-red-200';
  if (intensifier === 0) return 'bg-gray-100 text-gray-800 border-gray-200';
  if (intensifier <= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-green-100 text-green-800 border-green-200';
};

const getIntensifierLabel = (intensifier: number) => {
  if (intensifier < 0) return 'Suppress';
  if (intensifier === 0) return 'Neutral';
  if (intensifier <= 5) return 'Boost';
  return 'Strong Boost';
};


interface GlossaryItemsTableProps {
  data: GlossaryItem[];
  onSelectionChange?: (selectedItems: GlossaryItem[]) => void;
  onEdit: (item: GlossaryItem) => void;
  onSave: (item: GlossaryItem, updatedValues: Record<string, unknown>) => void;
  onDelete: (item: GlossaryItem) => void;
}

export interface GlossaryItemsTableRef {
  clearSelection: () => void;
}

export const GlossaryItemsTable = React.forwardRef<GlossaryItemsTableRef, GlossaryItemsTableProps>(
  function GlossaryItemsTable({
    data,
    onSelectionChange,
    onEdit,
    onSave,
    onDelete,
  }, ref) {
    const dataTableRef = React.useRef<DataTableRef>(null);
    const {
      editingItem,
      editingValues,
      startEditing,
      cancelEditing,
      updateEditingValue,
    } = useTableEditing<GlossaryItem>();
    
    const handleEdit = (item: GlossaryItem) => {
      startEditing(item, { word: item.word, intensifier: item.intensifier });
      onEdit(item);
    };
    
    const handleSave = () => {
      if (editingItem) {
        onSave(editingItem, editingValues);
      }
      cancelEditing();
    };
    
    const columns: ColumnDef<GlossaryItem>[] = [
      // Select column
      createSelectColumn<GlossaryItem>(),
      
      createEditableColumn<GlossaryItem>(
        "word",
        "Word",
        editingItem,
        String(editingValues.word || ''),
        (value) => updateEditingValue('word', value),
        handleSave,
        cancelEditing,
        {
          maxLength: 30,
          displayRenderer: (value) => <span className="font-medium">{String(value)}</span>
        }
      ),
      createEditableColumn<GlossaryItem>(
        "intensifier",
        "Intensifier",
        editingItem,
        String(editingValues.intensifier || 0),
        (value) => {
          if (value === '' || value === '-') {
            return;
          }
          const num = parseInt(value);
          if (!isNaN(num)) {
            updateEditingValue('intensifier', num);
          }
        },
        handleSave,
        cancelEditing,
        {
          type: "number",
          sortable: true,
          displayRenderer: (value) => <span>{String(value)}</span>
        }
      ),
      // Level/Status column using custom column to avoid key conflict
      createCustomColumn<GlossaryItem>(
        "level",
        () => <span>Level</span>,
        (item) => {
          const text = getIntensifierLabel(item.intensifier);
          const className = getIntensifierColor(item.intensifier);
          
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
              {text}
            </span>
          );
        },
        { enableSorting: false }
      ),
      createDateColumn<GlossaryItem>("created_at", "Added"),
      // Actions column with editing state handling
      createConditionalActionsColumn<GlossaryItem>(
        (item) => {
          if (editingItem?.id === item.id) {
            return (
              <div className="flex justify-end space-x-2">
                <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90" onClick={handleSave}>
                  Save
                </button>
                <button className="px-3 py-1 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded" onClick={cancelEditing}>
                  Cancel
                </button>
              </div>
            );
          }
          
          const actions: ActionMenuItem<GlossaryItem>[] = [
            {
              label: "Edit",
              onClick: () => handleEdit(item),
            },
            {
              label: "Delete",
              onClick: () => onDelete(item),
              className: "text-red-600",
            },
          ];
          
          return <ActionsDropdown item={item} actions={actions} />;
        }
      ),
    ];
    
    React.useImperativeHandle(ref, () => ({
      clearSelection: () => dataTableRef.current?.clearSelection()
    }), []);
    
    return (
      <div className="w-full min-w-[600px]">
        <DataTable 
          ref={dataTableRef}
          columns={columns} 
          data={data}
          onRowSelectionChange={onSelectionChange}
        />
      </div>
    );
  }
);