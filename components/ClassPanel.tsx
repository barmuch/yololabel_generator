'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  GripVertical,
  Palette,
  Search,
  X
} from 'lucide-react';
import { ClassDef } from '@/lib/types';
import { generateRandomColor, hslToHex } from '@/lib/utils';

export function ClassPanel() {
  const {
    currentProject,
    toolState,
    addClass,
    removeClass,
    updateClass,
    reorderClasses,
    setSelectedClass,
  } = useLabelStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassDef | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [draggedClassId, setDraggedClassId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get classes from either embedded classes or class set
  const classes = currentProject?.classSet?.classes || currentProject?.classes || [];
  
  // Filter classes based on search query
  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const handleAddClass = () => {
    if (newClassName.trim()) {
      addClass(newClassName.trim());
      setNewClassName('');
      setIsAddDialogOpen(false);
    }
  };

  const handleEditClass = (cls: ClassDef) => {
    setEditingClass(cls);
    setNewClassName(cls.name);
    setIsEditDialogOpen(true);
  };

  const handleUpdateClass = () => {
    if (editingClass && newClassName.trim()) {
      updateClass(editingClass.id, { name: newClassName.trim() });
      setEditingClass(null);
      setNewClassName('');
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteClass = (classId: number) => {
    if (confirm('Are you sure you want to delete this class? All associated annotations will be removed.')) {
      removeClass(classId);
    }
  };

  const handleColorChange = (classId: number, color: string) => {
    updateClass(classId, { color });
  };

  const handleDragStart = (e: React.DragEvent, classId: number) => {
    setDraggedClassId(classId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetClassId: number) => {
    e.preventDefault();
    
    if (draggedClassId === null || draggedClassId === targetClassId) return;

    const sourceIndex = classes.findIndex(c => c.id === draggedClassId);
    const targetIndex = classes.findIndex(c => c.id === targetClassId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newClasses = [...classes];
    const [removed] = newClasses.splice(sourceIndex, 1);
    newClasses.splice(targetIndex, 0, removed);

    reorderClasses(newClasses);
    setDraggedClassId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No project loaded
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Classes</h3>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Class</DialogTitle>
                <DialogDescription>
                  Create a new class for labeling objects in your images.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Class name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleAddClass)}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddClass} disabled={!newClassName.trim()}>
                    Add Class
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        {classes.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search classes... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                title="Clear search (Esc)"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            {filteredClasses.length} of {classes.length} classes
            {filteredClasses.length === 0 && (
              <span className="text-orange-600 dark:text-orange-400"> - No matches found</span>
            )}
          </div>
        )}
      </div>

      {/* Class list - Fixed height container with scroll for max 9 items */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="overflow-y-auto scrollbar-thin"
          style={{ 
            maxHeight: 'calc(9 * 3.5rem + 0.5rem)', // 9 items * height + padding
            height: 'auto'
          }}
        >
          {!classes || classes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No classes defined</p>
              <p className="text-sm">Add your first class to start labeling</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No classes match your search</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredClasses.map((cls, index) => {
                // Get the original index in the full classes array for keyboard shortcuts
                const originalIndex = classes.findIndex(c => c.id === cls.id);
                
                return (
                  <div
                    key={cls.id}
                    className={`
                      group flex items-center p-3 rounded-lg border transition-colors
                      ${toolState.selectedClassId === cls.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50 border-border'
                      }
                    `}
                    style={{ height: '3.5rem' }} // Fixed height for consistent scrolling
                    draggable
                    onDragStart={(e) => handleDragStart(e, cls.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cls.id)}
                    onClick={() => setSelectedClass(cls.id)}
                  >
                    {/* Drag handle */}
                    <GripVertical className="w-4 h-4 text-muted-foreground mr-2 cursor-grab flex-shrink-0" />

                    {/* Class indicator */}
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div
                          className="w-6 h-6 rounded-md border-2 border-white shadow-sm cursor-pointer"
                          style={{ backgroundColor: cls.color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newColor = generateRandomColor();
                            handleColorChange(cls.id, newColor);
                          }}
                          title="Click to change color"
                        />
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {cls.id}
                        </span>
                      </div>
                      
                      <span className="font-medium truncate" title={cls.name}>
                        {cls.name}
                      </span>
                      
                      {/* Keyboard shortcut - only show for first 9 classes */}
                      {originalIndex < 9 && (
                        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                          {originalIndex + 1}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClass(cls);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(cls.id);
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        disabled={!classes || classes.length === 1}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Scroll indicator for more than 9 classes */}
        {filteredClasses.length > 9 && (
          <div className="text-center py-2 text-xs text-muted-foreground bg-muted/30 border-t">
            ↕ Scroll to see {filteredClasses.length - 9} more classes
          </div>
        )}
      </div>

      {/* Class count and info */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/50">
        <div className="text-sm text-muted-foreground">
          <div>
            {searchQuery ? (
              <>
                Showing {filteredClasses.length > 9 ? `9 of ${filteredClasses.length}` : filteredClasses.length} filtered classes
                {classes.length !== filteredClasses.length && (
                  <span className="text-blue-600 dark:text-blue-400"> (from {classes?.length || 0} total)</span>
                )}
              </>
            ) : (
              <>
                Showing {classes.length > 9 ? `9 of ${classes?.length || 0}` : classes?.length || 0} classes
                {classes.length > 9 && (
                  <span className="text-amber-600 dark:text-amber-400"> (scroll for more)</span>
                )}
              </>
            )}
          </div>
          <div className="text-xs mt-1">
            {searchQuery ? (
              'Clear search to see all classes • Esc to clear'
            ) : classes.length > 9 ? (
              'Press 1-9 for quick access • Ctrl+F to search • Scroll for more'
            ) : (
              'Press 1-9 to select classes • Ctrl+F to search'
            )}
          </div>
        </div>
      </div>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Modify the class name and color. Click the color box to change the color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-md border-2 border-white shadow-sm cursor-pointer"
                style={{ backgroundColor: editingClass?.color }}
                onClick={() => {
                  if (editingClass) {
                    const newColor = generateRandomColor();
                    handleColorChange(editingClass.id, newColor);
                    setEditingClass({ ...editingClass, color: newColor });
                  }
                }}
                title="Click to change color"
              />
              <Input
                placeholder="Class name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleUpdateClass)}
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateClass} disabled={!newClassName.trim()}>
                Update Class
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
