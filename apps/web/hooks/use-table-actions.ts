import { useState, useCallback } from 'react';

// Generic editing state hook
export function useTableEditing<T extends { id: string }>() {
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});

  const startEditing = useCallback((item: T, initialValues: Record<string, any> = {}) => {
    setEditingItem(item);
    setEditingValues(initialValues);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingItem(null);
    setEditingValues({});
  }, []);

  const updateEditingValue = useCallback((key: string, value: any) => {
    setEditingValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const isEditing = useCallback((item: T) => {
    return editingItem?.id === item.id;
  }, [editingItem]);

  return {
    editingItem,
    editingValues,
    startEditing,
    cancelEditing,
    updateEditingValue,
    isEditing,
  };
}

// Generic CRUD operations hook
interface CrudOperations<T, CreateData, UpdateData> {
  create?: (data: CreateData) => Promise<T>;
  update?: (id: string, data: UpdateData) => Promise<T>;
  delete?: (id: string) => Promise<void>;
}

export function useCrudOperations<T extends { id: string }, CreateData, UpdateData>(
  operations: CrudOperations<T, CreateData, UpdateData>,
  onSuccess?: (operation: 'create' | 'update' | 'delete', item?: T) => void,
  onError?: (operation: 'create' | 'update' | 'delete', error: Error) => void
) {
  const [loading, setLoading] = useState(false);

  const handleCreate = useCallback(async (data: CreateData) => {
    if (!operations.create) return;
    
    setLoading(true);
    try {
      const result = await operations.create(data);
      onSuccess?.('create', result);
      return result;
    } catch (error) {
      onError?.('create', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [operations.create, onSuccess, onError]);

  const handleUpdate = useCallback(async (id: string, data: UpdateData) => {
    if (!operations.update) return;
    
    setLoading(true);
    try {
      const result = await operations.update(id, data);
      onSuccess?.('update', result);
      return result;
    } catch (error) {
      onError?.('update', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [operations.update, onSuccess, onError]);

  const handleDelete = useCallback(async (id: string) => {
    if (!operations.delete) return;
    
    setLoading(true);
    try {
      await operations.delete(id);
      onSuccess?.('delete');
    } catch (error) {
      onError?.('delete', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [operations.delete, onSuccess, onError]);

  return {
    loading,
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}

// Search and filter hook
export function useTableFilter<T>(
  data: T[],
  searchFields: (keyof T)[],
  initialSearchQuery = ''
) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const filteredData = data.filter(item =>
    searchQuery === '' || 
    searchFields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
    })
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
  };
}