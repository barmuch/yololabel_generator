import React, { useState, useEffect, useCallback } from 'react';
import { ClassSet, ClassDef } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Palette, Plus, Settings } from 'lucide-react';
import Link from 'next/link';

interface SimpleClassSelectorProps {
  onSelectionChange: (option: 'none' | 'template' | 'custom', data?: { classSetId?: string; classes?: ClassDef[] }) => void;
}

export default function SimpleClassSelector({ onSelectionChange }: SimpleClassSelectorProps) {
  const [templates, setTemplates] = useState<ClassSet[]>([]);
  const [selectedOption, setSelectedOption] = useState<'none' | 'template' | 'custom'>('none');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customClasses, setCustomClasses] = useState<ClassDef[]>([
    { id: 0, name: 'Object', color: '#3B82F6' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSelectionChange = useCallback(() => {
    switch (selectedOption) {
      case 'none':
        onSelectionChange('none');
        break;
      case 'template':
        if (selectedTemplateId) {
          onSelectionChange('template', { classSetId: selectedTemplateId });
        }
        break;
      case 'custom':
        onSelectionChange('custom', { classes: customClasses });
        break;
    }
  }, [selectedOption, selectedTemplateId, customClasses, onSelectionChange]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    handleSelectionChange();
  }, [selectedOption, selectedTemplateId, customClasses]); // Depend on the actual values, not the function

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

  const addCustomClass = () => {
    const newClass: ClassDef = {
      id: Math.max(...customClasses.map(c => c.id), 0) + 1,
      name: `Class ${customClasses.length + 1}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    setCustomClasses([...customClasses, newClass]);
  };

  const updateCustomClass = (index: number, field: 'name' | 'color', value: string) => {
    const updatedClasses = customClasses.map((cls, i) => 
      i === index ? { ...cls, [field]: value } : cls
    );
    setCustomClasses(updatedClasses);
  };

  const removeCustomClass = (index: number) => {
    if (customClasses.length > 1) {
      setCustomClasses(customClasses.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Class Configuration</h3>
  <Link href="/templates" className="text-sm text-[hsl(var(--brand-green-light))] hover:text-[hsl(var(--brand-green-base))] flex items-center space-x-1">
          <Settings className="w-4 h-4" />
          <span>Manage Templates</span>
        </Link>
      </div>

      <div className="space-y-4">
        {/* No Classes Option */}
        <div className="flex items-center space-x-2 p-4 border rounded-lg">
          <input
            type="radio"
            id="none"
            name="classOption"
            value="none"
            checked={selectedOption === 'none'}
            onChange={(e) => setSelectedOption(e.target.value as 'none' | 'template' | 'custom')}
            className="text-[hsl(var(--brand-green-base))]"
          />
          <label htmlFor="none" className="flex-1 cursor-pointer">
            <div>
              <div className="font-medium">Start without classes</div>
              <div className="text-sm text-muted-foreground">Add classes later as needed</div>
            </div>
          </label>
        </div>

        {/* Template Option */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <input
              type="radio"
              id="template"
              name="classOption"
              value="template"
              checked={selectedOption === 'template'}
              onChange={(e) => setSelectedOption(e.target.value as 'none' | 'template' | 'custom')}
              className="text-[hsl(var(--brand-green-base))]"
            />
            <label htmlFor="template" className="flex-1 cursor-pointer">
              <div>
                <div className="font-medium">Use existing template</div>
                <div className="text-sm text-muted-foreground">Select from pre-made class sets</div>
              </div>
            </label>
          </div>

          {selectedOption === 'template' && (
            <div className="ml-6 space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No templates available. <Link href="/templates" className="text-[hsl(var(--brand-green-light))] hover:text-[hsl(var(--brand-green-base))]">Create one first</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedTemplateId === template.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {template.classes.length} classes • Used by {template.projectCount} projects
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {template.classes.slice(0, 4).map((cls, index) => (
                            <div
                              key={index}
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: cls.color }}
                              title={cls.name}
                            />
                          ))}
                          {template.classes.length > 4 && (
                            <div className="w-4 h-4 rounded-full bg-gray-200 text-xs flex items-center justify-center">
                              +{template.classes.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedTemplateId === template.id && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs font-medium mb-1">Classes:</div>
                          <div className="flex flex-wrap gap-1">
                            {template.classes.map((cls, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 bg-white border rounded text-xs"
                              >
                                <div 
                                  className="w-2 h-2 rounded-full mr-1"
                                  style={{ backgroundColor: cls.color }}
                                />
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Classes Option */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <input
              type="radio"
              id="custom"
              name="classOption"
              value="custom"
              checked={selectedOption === 'custom'}
              onChange={(e) => setSelectedOption(e.target.value as 'none' | 'template' | 'custom')}
              className="text-[hsl(var(--brand-green-base))]"
            />
            <label htmlFor="custom" className="flex-1 cursor-pointer">
              <div>
                <div className="font-medium">Create custom classes</div>
                <div className="text-sm text-muted-foreground">Define classes specific to this project</div>
              </div>
            </label>
          </div>

          {selectedOption === 'custom' && (
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Define Classes:</div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomClass}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Class
                </Button>
              </div>
              
              <div className="space-y-2">
                {customClasses.map((cls, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={cls.name}
                      onChange={(e) => updateCustomClass(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Class name"
                    />
                    <input
                      type="color"
                      value={cls.color}
                      onChange={(e) => updateCustomClass(index, 'color', e.target.value)}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeCustomClass(index)}
                      disabled={customClasses.length === 1}
                      className="px-2"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Classes defined here will be unique to this project only.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
