"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableRef } from "@/components/ui/data-table";
import { Glossary } from "@/types/glossary";
import { useTableEditing } from "@/hooks/use-table-actions";
import { 
  createSortableColumn, 
  createDateColumn,
  createEditableColumn,
  createSelectColumn,
  createConditionalActionsColumn,
  ActionsDropdown,
  ActionMenuItem
} from "@/components/ui/table-columns";
import Link from "next/link";


interface GlossariesTableProps {
  data: Glossary[];
  onSelectionChange?: (selectedGlossaries: Glossary[]) => void;
  onEdit: (glossary: Glossary) => void;
  onSave: (glossary: Glossary, updatedValues: Record<string, unknown>) => void;
  onDelete: (glossary: Glossary) => void;
}

export interface GlossariesTableRef {
  clearSelection: () => void;
}

export const GlossariesTable = React.forwardRef<GlossariesTableRef, GlossariesTableProps>(
  function GlossariesTable({
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
    } = useTableEditing<Glossary>();
    
    const handleEdit = (glossary: Glossary) => {
      startEditing(glossary, { name: glossary.name });
      onEdit(glossary);
    };
    
    const handleSave = () => {
      if (editingItem) {
        onSave(editingItem, editingValues);
      }
      cancelEditing();
    };
    
    const columns: ColumnDef<Glossary>[] = [
      // Select column
      createSelectColumn<Glossary>(),
      
      // Name column with editing capability
      createEditableColumn<Glossary>(
        "name",
        "Name",
        editingItem,
        String(editingValues.name || ''),
        (value) => updateEditingValue('name', value),
        handleSave,
        cancelEditing,
        {
          maxLength: 50,
          displayRenderer: (value, glossary) => (
            <Link href={`/dashboard/glossaries/${glossary.id}`}>
              <span className="font-medium hover:underline cursor-pointer">{String(value)}</span>
            </Link>
          )
        }
      ),
      
      // Items count column
      createSortableColumn<Glossary>("item_count", "Items"),
      
      // Created date column
      createDateColumn<Glossary>("created_at", "Created"),
      
      // Actions column with editing state handling
      createConditionalActionsColumn<Glossary>(
        (glossary) => {
          if (editingItem?.id === glossary.id) {
            return (
              <div className="flex justify-end space-x-2">
                <button 
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button 
                  className="px-3 py-1 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              </div>
            );
          }
          
          const actions: ActionMenuItem<Glossary>[] = [
            {
              label: "View Items",
              onClick: () => window.location.href = `/dashboard/glossaries/${glossary.id}`,
            },
            {
              label: "Edit",
              onClick: () => handleEdit(glossary),
            },
            {
              label: "Delete",
              onClick: () => onDelete(glossary),
              className: "text-red-600",
            },
          ];
          
          return <ActionsDropdown item={glossary} actions={actions} />;
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