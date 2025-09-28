'use client';

import React, { useState, useEffect } from 'react';
import { ClassSet, ClassDef } from '@/lib/types';
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
  Edit, 
  Trash2, 
  Save, 
  X, 
  Palette,
  Users,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<ClassSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ClassSet | null>(null);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  
  // New template form
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateClasses, setNewTemplateClasses] = useState<ClassDef[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/class-sets');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.classSets);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewTemplate = async () => {
    if (!newTemplateName.trim() || newTemplateClasses.length === 0) {
      alert('Please provide template name and at least one class');
      return;
    }

    try {
      const response = await fetch('/api/class-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          description: newTemplateDescription,
          classes: newTemplateClasses
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTemplates([...templates, data.classSet]);
        setNewTemplateName('');
        setNewTemplateDescription('');
        setNewTemplateClasses([]);
        setIsNewTemplateOpen(false);
        alert('Template created successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template');
    }
  };

  const updateTemplate = async (template: ClassSet) => {
    try {
      const response = await fetch(`/api/class-sets/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          classes: template.classes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTemplates(templates.map(t => t.id === template.id ? data.classSet : t));
        setEditingTemplate(null);
        alert('Template updated successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    }
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) return;

    try {
      const response = await fetch(`/api/class-sets/${templateId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setTemplates(templates.filter(t => t.id !== templateId));
        alert('Template deleted successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const addClassToNewTemplate = () => {
    const newClass: ClassDef = {
      id: newTemplateClasses.length,
      name: `Class ${newTemplateClasses.length + 1}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    setNewTemplateClasses([...newTemplateClasses, newClass]);
  };

  const updateNewTemplateClass = (index: number, field: 'name' | 'color', value: string) => {
    const updatedClasses = newTemplateClasses.map((cls, i) => 
      i === index ? { ...cls, [field]: value } : cls
    );
    setNewTemplateClasses(updatedClasses);
  };

  const removeNewTemplateClass = (index: number) => {
    setNewTemplateClasses(newTemplateClasses.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
  <header className="border-b brand-header">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-[hsl(var(--brand-green-light))] hover:text-[hsl(var(--brand-green-base))]">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Projects</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Class Templates</h1>
                <p className="text-muted-foreground">Manage reusable class definitions for your projects</p>
              </div>
            </div>

            <Dialog open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Template</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Class Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable template with predefined classes for faster project setup.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Template Name:</label>
                    <Input
                      placeholder="e.g., Vehicle Detection Classes"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (optional):</label>
                    <Input
                      placeholder="Describe this template..."
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">Classes:</label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addClassToNewTemplate}
                        className="text-xs"
                      >
                        Add Class
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {newTemplateClasses.map((cls, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={cls.name}
                            onChange={(e) => updateNewTemplateClass(index, 'name', e.target.value)}
                            placeholder="Class name"
                            className="flex-1"
                          />
                          <input
                            type="color"
                            value={cls.color}
                            onChange={(e) => updateNewTemplateClass(index, 'color', e.target.value)}
                            className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeNewTemplateClass(index)}
                            className="px-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {newTemplateClasses.length === 0 && (
                        <div className="text-gray-500 text-center py-4">
                          No classes yet. Click &quot;Add Class&quot; to start.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsNewTemplateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createNewTemplate} disabled={!newTemplateName.trim() || newTemplateClasses.length === 0}>
                      Create Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Loading templates...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <div className="text-muted-foreground">
                <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                <p className="mb-4">Create your first class template to reuse across projects</p>
                <Button onClick={() => setIsNewTemplateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-6 bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Palette className="w-4 h-4 mr-1" />
                          {template.classes.length} classes
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {template.projectCount} projects
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate(template)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id, template.name)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        disabled={template.projectCount > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Classes Preview:</div>
                    <div className="flex flex-wrap gap-2">
                      {template.classes.slice(0, 6).map((cls, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded text-xs"
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cls.color }}
                          ></div>
                          <span>{cls.name}</span>
                        </div>
                      ))}
                      {template.classes.length > 6 && (
                        <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                          +{template.classes.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={updateTemplate}
          onCancel={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

// Template Editor Component
interface TemplateEditorProps {
  template: ClassSet;
  onSave: (template: ClassSet) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<ClassSet>({ ...template });

  const addClass = () => {
    const newClass: ClassDef = {
      id: Math.max(...editedTemplate.classes.map(c => c.id), 0) + 1,
      name: `Class ${editedTemplate.classes.length + 1}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    setEditedTemplate({
      ...editedTemplate,
      classes: [...editedTemplate.classes, newClass]
    });
  };

  const updateClass = (index: number, field: 'name' | 'color', value: string) => {
    const updatedClasses = editedTemplate.classes.map((cls, i) => 
      i === index ? { ...cls, [field]: value } : cls
    );
    setEditedTemplate({
      ...editedTemplate,
      classes: updatedClasses
    });
  };

  const removeClass = (index: number) => {
    setEditedTemplate({
      ...editedTemplate,
      classes: editedTemplate.classes.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Template: {template.name}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name:</label>
              <Input
                value={editedTemplate.name}
                onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description:</label>
              <Input
                value={editedTemplate.description || ''}
                onChange={(e) => setEditedTemplate({ ...editedTemplate, description: e.target.value })}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Classes:</label>
                <Button size="sm" onClick={addClass}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Class
                </Button>
              </div>
              
              <div className="space-y-2">
                {editedTemplate.classes.map((cls, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={cls.name}
                      onChange={(e) => updateClass(index, 'name', e.target.value)}
                      placeholder="Class name"
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={cls.color}
                      onChange={(e) => updateClass(index, 'color', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeClass(index)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedTemplate)}>
            <Save className="w-4 h-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
