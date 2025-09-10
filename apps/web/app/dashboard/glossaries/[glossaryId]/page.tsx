'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BulkActions, commonBulkActions } from '@/components/ui/bulk-actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/dialog/delete-dialog';
import { GlossaryItemsTable } from '@/components/table/glossary-items-table';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Plus, Search, Volume2, Edit, X, Trash } from 'lucide-react';
import { glossaryApi } from '@/lib/api';
import { GlossaryItem } from '@/types/glossary';
import Link from 'next/link';
import { toast } from 'sonner';

export default function GlossaryDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const glossaryId = params.glossaryId as string;

  const [glossaryItems, setGlossaryItems] = useState<GlossaryItem[]>([]);
  const [glossaryName, setGlossaryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newItemWord, setNewItemWord] = useState('');
  const [newItemIntensifier, setNewItemIntensifier] = useState<number>(1);
  const [editingGlossaryName, setEditingGlossaryName] = useState(false);
  const [editGlossaryName, setEditGlossaryName] = useState('');
  const [deletingItem, setDeletingItem] = useState<GlossaryItem | null>(null);
  const [isDeleteItemDialogOpen, setIsDeleteItemDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<GlossaryItem[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const filteredItems = glossaryItems?.filter(item =>
    item.word.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const loadGlossaryItems = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await glossaryApi.getGlossaryItems(token, glossaryId);
      setGlossaryItems(response.glossaryItems || []);
      setGlossaryName(response.glossary_name || 'Untitled Glossary');
    } catch (error) {
      console.error('Error loading glossary items:', error);
      
      // Handle specific error cases
      if (error instanceof Error && error.message === 'Glossary not found') {
        setNotFound(true);
        toast.error('This glossary was not found or you do not have access to it');
        // Redirect back to glossaries list after a short delay
        setTimeout(() => {
          router.push('/dashboard/glossaries');
        }, 2000);
      } else {
        toast.error('Failed to load glossary items');
      }
      
      setGlossaryItems([]); // Ensure we always have an array
      setGlossaryName('Glossary Not Found');
    } finally {
      setLoading(false);
    }
  }, [getToken, glossaryId, router]);

  useEffect(() => {
    if (glossaryId) {
      loadGlossaryItems();
    }
  }, [glossaryId, loadGlossaryItems]);

  const handleCreateItem = async () => {
    if (!newItemWord.trim()) {
      toast.error('Word is required');
      return;
    }

    if (newItemWord.trim().length > 30) {
      toast.error('Word must be less than 30 characters');
      return;
    }

    if (newItemIntensifier < -10 || newItemIntensifier > 10) {
      toast.error('Intensifier must be between -10 and 10');
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const newItem = await glossaryApi.createGlossaryItem(token, glossaryId, {
        word: newItemWord.trim(),
        intensifier: newItemIntensifier,
      });

      setGlossaryItems(prev => [newItem, ...(prev || [])]);
      setNewItemWord('');
      setNewItemIntensifier(1);
      setIsCreateDialogOpen(false);
      toast.success('Glossary item added successfully');
    } catch (error) {
      console.error('Error creating glossary item:', error);
      toast.error('Failed to create glossary item');
    }
  };

  const handleUpdateItem = async (item: GlossaryItem, updatedValues: Record<string, unknown>) => {
    const word = updatedValues.word as string;
    const intensifier = updatedValues.intensifier as number;
    
    if (!word?.trim()) return;

    if (word.trim().length > 30) {
      toast.error('Word must be less than 30 characters');
      return;
    }

    if (intensifier < -10 || intensifier > 10) {
      toast.error('Intensifier must be between -10 and 10');
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const updatedItem = await glossaryApi.updateGlossaryItem(token, glossaryId, item.id, {
        word: word.trim(),
        intensifier: intensifier,
      });

      setGlossaryItems(prev => (prev || []).map(i => i.id === item.id ? updatedItem : i));
      toast.success('Glossary item updated successfully');
    } catch (error) {
      console.error('Error updating glossary item:', error);
      toast.error('Failed to update glossary item');
    }
  };

  const handleDeleteItem = (item: GlossaryItem) => {
    setDeletingItem(item);
    setIsDeleteItemDialogOpen(true);
  };

  const handleSelectionChange = useCallback((selectedItems: GlossaryItem[]) => {
    setSelectedItems(selectedItems);
  }, []);

  const handleBulkDelete = () => {
    if (selectedItems.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
    // Note: Table ref would clear selection here if we had one
  };

  const performBulkDelete = async () => {
    const token = await getToken();
    if (!token) throw new Error('Authentication required');

    const errors: string[] = [];
    const successfulDeletes: string[] = [];

    for (const item of selectedItems) {
      try {
        await glossaryApi.deleteGlossaryItem(token, glossaryId, item.id);
        successfulDeletes.push(item.id);
      } catch (error) {
        console.error(`Failed to delete item ${item.word}:`, error);
        errors.push(item.word);
      }
    }

    // Update the items list by removing successfully deleted items
    setGlossaryItems(prev => (prev || []).filter(item => !successfulDeletes.includes(item.id)));
    
    // Clear selection
    setSelectedItems([]);

    // Show appropriate toast messages
    if (successfulDeletes.length > 0) {
      toast.success(`${successfulDeletes.length} item${successfulDeletes.length !== 1 ? 's' : ''} deleted successfully`);
    }
    
    if (errors.length > 0) {
      toast.error(`Failed to delete ${errors.length} item${errors.length !== 1 ? 's' : ''}: ${errors.join(', ')}`);
    }
  };


  const startEditingGlossaryName = () => {
    setEditingGlossaryName(true);
    setEditGlossaryName(glossaryName);
  };

  const cancelEditingGlossaryName = () => {
    setEditingGlossaryName(false);
    setEditGlossaryName('');
  };

  const handleUpdateGlossaryName = async () => {
    if (!editGlossaryName.trim()) {
      toast.error('Glossary name is required');
      return;
    }

    if (editGlossaryName.trim().length > 50) {
      toast.error('Glossary name must be less than 50 characters');
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      await glossaryApi.updateGlossary(token, glossaryId, {
        name: editGlossaryName.trim(),
      });

      setGlossaryName(editGlossaryName.trim());
      setEditingGlossaryName(false);
      setEditGlossaryName('');
      toast.success('Glossary name updated successfully');
    } catch (error) {
      console.error('Error updating glossary name:', error);
      toast.error('Failed to update glossary name');
    }
  };


  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          loading={true}
          loadingLeftWidth="w-16"
          loadingRightWidths={["w-32", "w-20"]}
        />

        {/* Title Section */}
        <div className="px-4 sm:px-6 py-6 border-b border-border">
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <div className="h-full p-4 pb-20 relative">
              <div className="animate-pulse space-y-4">
                {/* Table header */}
                <div className="flex space-x-4 p-4 border-b">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
                
                {/* Table rows */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex space-x-4 p-4 border-b">
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-8"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard/glossaries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Glossaries
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <div className="h-12 w-12 text-destructive mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Glossary Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This glossary was not found or you do not have access to it.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you back to glossaries...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        leftContent={
          <Link href="/dashboard/glossaries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        }
        rightContent={
          <>
            {selectedItems.length > 0 ? (
              <BulkActions
                selectedCount={selectedItems.length}
                onClear={handleClearSelection}
                actions={[
                  commonBulkActions.delete(handleBulkDelete),
                ]}
              />
            ) : (
              <>
                {/* Search */}
                <div className="flex-1 min-w-0 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search words..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full text-sm"
                    />
                  </div>
                </div>
                
                {/* Add Word Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Word
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Word</DialogTitle>
                  <DialogDescription>
                    Add a word to this glossary with its intensifier level.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="word">Word</Label>
                    <Input
                      id="word"
                      placeholder="Enter word"
                      value={newItemWord}
                      onChange={(e) => setNewItemWord(e.target.value)}
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <Label htmlFor="intensifier">Intensifier Level (-10 to 10)</Label>
                    <Input
                      id="intensifier"
                      type="number"
                      min="-10"
                      max="10"
                      value={newItemIntensifier}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          return; // Allow empty or just dash while typing
                        }
                        const num = parseInt(value);
                        if (!isNaN(num)) {
                          setNewItemIntensifier(num);
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Positive values boost keywords, negative suppress them, 0 disables boosting entirely.
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateItem}>Add Word</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
              </>
            )}
          </>
        }
      />

      {/* Title Section */}
      <div className="px-4 sm:px-6 py-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {editingGlossaryName ? (
              <div className="space-y-2">
                <Input
                  value={editGlossaryName}
                  onChange={(e) => setEditGlossaryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateGlossaryName();
                    if (e.key === 'Escape') cancelEditingGlossaryName();
                  }}
                  className="text-3xl font-bold h-12 border-2 max-w-md"
                  maxLength={50}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleUpdateGlossaryName}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditingGlossaryName}>
                    Cancel
                  </Button>
                </div>
                <p className="text-muted-foreground">
                  Manage words and their intensifier levels for enhanced transcription accuracy.
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{glossaryName}</h1>
                  <p className="text-muted-foreground">
                    Manage words and their intensifier levels for enhanced transcription accuracy.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditingGlossaryName}
                  className="mt-[-8px]"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {filteredItems.length > 0 ? (
          <div className="flex-1 overflow-x-auto" style={{ clipPath: 'none' }}>
            <div className="h-full p-4 pb-20 relative">
              <GlossaryItemsTable
                data={filteredItems}
                onSelectionChange={handleSelectionChange}
                onEdit={() => {}} // No-op since table handles editing internally
                onSave={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Volume2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No words found' : 'No words yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query.' 
                  : 'Add your first word to start building this glossary.'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Word
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Word Dialog */}
      {deletingItem && (
        <DeleteDialog
          open={isDeleteItemDialogOpen}
          onOpenChange={setIsDeleteItemDialogOpen}
          items={[{ name: deletingItem.word }]}
          onDelete={async () => {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');
            await glossaryApi.deleteGlossaryItem(token, glossaryId, deletingItem.id);
            setGlossaryItems(prev => (prev || []).filter(i => i.id !== deletingItem.id));
            toast.success('Word deleted successfully');
          }}
        />
      )}

      {/* Bulk Delete Dialog */}
      {selectedItems.length > 0 && (
        <DeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          items={selectedItems.map(item => ({ name: item.word }))}
          onDelete={performBulkDelete}
        />
      )}
    </div>
  );
}