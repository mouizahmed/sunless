'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BulkActions, commonBulkActions } from '@/components/ui/bulk-actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteDialog } from '@/components/dialog/delete-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { BookOpen, Plus, Search, X, Trash } from 'lucide-react';
import { glossaryApi } from '@/lib/api';
import { Glossary } from '@/types/glossary';
import { GlossariesTable } from '@/components/table/glossaries-table';
import { toast } from 'sonner';

export default function GlossariesPage() {
  const { getToken } = useAuth();
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGlossaryName, setNewGlossaryName] = useState('');
  const [deletingGlossary, setDeletingGlossary] = useState<Glossary | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGlossaries, setSelectedGlossaries] = useState<Glossary[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const filteredGlossaries = glossaries?.filter(glossary =>
    glossary.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const loadGlossaries = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await glossaryApi.getGlossaries(token);
      setGlossaries(response.glossaries || []);
    } catch (error) {
      console.error('Error loading glossaries:', error);
      toast.error('Failed to load glossaries');
      setGlossaries([]); // Ensure we always have an array
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadGlossaries();
  }, [loadGlossaries]);

  const handleCreateGlossary = async () => {
    if (!newGlossaryName.trim()) {
      toast.error('Glossary name is required');
      return;
    }

    if (newGlossaryName.trim().length > 50) {
      toast.error('Glossary name must be less than 50 characters');
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const newGlossary = await glossaryApi.createGlossary(token, {
        name: newGlossaryName.trim(),
      });

      setGlossaries(prev => [...(prev || []), newGlossary]);
      setNewGlossaryName('');
      setIsCreateDialogOpen(false);
      toast.success('Glossary created successfully');
    } catch (error) {
      console.error('Error creating glossary:', error);
      toast.error('Failed to create glossary');
    }
  };

  const handleUpdateGlossary = async (glossary: Glossary, updatedValues: Record<string, unknown>) => {
    const name = updatedValues.name as string;
    if (!name?.trim()) return;

    if (name.trim().length > 50) {
      toast.error('Glossary name must be less than 50 characters');
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const updatedGlossary = await glossaryApi.updateGlossary(token, glossary.id, {
        name: name.trim(),
      });

      setGlossaries(prev => (prev || []).map(g => g.id === glossary.id ? updatedGlossary : g));
      toast.success('Glossary updated successfully');
    } catch (error) {
      console.error('Error updating glossary:', error);
      toast.error('Failed to update glossary');
    }
  };

  const handleDeleteGlossary = (glossary: Glossary) => {
    setDeletingGlossary(glossary);
    setIsDeleteDialogOpen(true);
  };

  const handleSelectionChange = useCallback((selectedGlossaries: Glossary[]) => {
    setSelectedGlossaries(selectedGlossaries);
  }, []);

  const handleBulkDelete = () => {
    if (selectedGlossaries.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedGlossaries([]);
    // Note: Table ref would clear selection here if we had one
  };

  const performBulkDelete = async () => {
    const token = await getToken();
    if (!token) throw new Error('Authentication required');

    const errors: string[] = [];
    const successfulDeletes: string[] = [];

    for (const glossary of selectedGlossaries) {
      try {
        await glossaryApi.deleteGlossary(token, glossary.id);
        successfulDeletes.push(glossary.id);
      } catch (error) {
        console.error(`Failed to delete glossary ${glossary.name}:`, error);
        errors.push(glossary.name);
      }
    }

    // Update the glossaries list by removing successfully deleted items
    setGlossaries(prev => (prev || []).filter(g => !successfulDeletes.includes(g.id)));
    
    // Clear selection
    setSelectedGlossaries([]);

    // Show appropriate toast messages
    if (successfulDeletes.length > 0) {
      toast.success(`${successfulDeletes.length} glossar${successfulDeletes.length !== 1 ? 'ies' : 'y'} deleted successfully`);
    }
    
    if (errors.length > 0) {
      toast.error(`Failed to delete ${errors.length} glossar${errors.length !== 1 ? 'ies' : 'y'}: ${errors.join(', ')}`);
    }
  };


  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          loading={true}
          loadingLeftWidth="w-20"
          loadingRightWidths={["w-32", "w-24"]}
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <div className="h-full p-4 pb-20 relative">
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded w-full"></div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        leftContent={
          <h2 className="text-lg font-semibold">Glossaries</h2>
        }
        rightContent={
          <>
            {selectedGlossaries.length > 0 ? (
              <BulkActions
                selectedCount={selectedGlossaries.length}
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
                      placeholder="Search glossaries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full text-sm"
                    />
                  </div>
                </div>
                
                {/* New Glossary Button */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Glossary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Glossary</DialogTitle>
                  <DialogDescription>
                    Create a new glossary to help improve transcription accuracy for specific terms.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter glossary name"
                      value={newGlossaryName}
                      onChange={(e) => setNewGlossaryName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateGlossary()}
                      maxLength={50}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGlossary}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
              </>
            )}
          </>
        }
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {filteredGlossaries.length > 0 ? (
          <div className="flex-1 overflow-x-auto" style={{ clipPath: 'none' }}>
            <div className="h-full p-4 pb-20 relative">
              <GlossariesTable
                data={filteredGlossaries}
                onSelectionChange={handleSelectionChange}
                onEdit={() => {}} // No-op since table handles editing internally
                onSave={handleUpdateGlossary}
                onDelete={handleDeleteGlossary}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No glossaries found' : 'No glossaries yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query.' 
                  : 'Create your first glossary to start improving transcription accuracy.'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Glossary
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Glossary Dialog */}
      {deletingGlossary && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          items={[deletingGlossary]}
          onDelete={async () => {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');
            await glossaryApi.deleteGlossary(token, deletingGlossary.id);
            setGlossaries(prev => (prev || []).filter(g => g.id !== deletingGlossary.id));
            toast.success('Glossary deleted successfully');
          }}
        />
      )}

      {/* Bulk Delete Dialog */}
      {selectedGlossaries.length > 0 && (
        <DeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          items={selectedGlossaries}
          onDelete={performBulkDelete}
        />
      )}
    </div>
  );
}