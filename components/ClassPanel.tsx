'use client';

import React, { useState } from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
  Palette
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

  const classes = currentProject?.classes || [];

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
      <div className="flex items-center justify-between p-4 border-b">
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

      {/* Class list */}
      <div className="flex-1 overflow-y-auto">
        {!classes || classes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No classes defined</p>
            <p className="text-sm">Add your first class to start labeling</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {classes.map((cls, index) => (
              <div
                key={cls.id}
                className={`
                  group flex items-center p-3 rounded-lg border transition-colors
                  ${toolState.selectedClassId === cls.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted/50 border-border'
                  }
                `}
                draggable
                onDragStart={(e) => handleDragStart(e, cls.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, cls.id)}
                onClick={() => setSelectedClass(cls.id)}
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-muted-foreground mr-2 cursor-grab" />

                {/* Class indicator */}
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
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
                  
                  <span className="font-medium truncate">{cls.name}</span>
                  
                  {/* Keyboard shortcut */}
                  {index < 9 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            ))}
          </div>
        )}
      </div>

      {/* Class count and info */}
      <div className="p-4 border-t bg-muted/50">
        <div className="text-sm text-muted-foreground">
          <div>Total classes: {classes?.length || 0}</div>
          <div className="text-xs mt-1">
            Press 1-9 to select classes quickly
          </div>
        </div>
      </div>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
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
