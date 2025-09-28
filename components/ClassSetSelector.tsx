import React, { useState, useEffect } from 'react';
import { ClassSet, ClassDef } from '@/lib/types';

interface ClassSetSelectorProps {
  onClassSetSelect: (classSetId: string | null, classes: ClassDef[]) => void;
  initialClasses?: ClassDef[];
}

export default function ClassSetSelector({ onClassSetSelect, initialClasses = [] }: ClassSetSelectorProps) {
  const [classSets, setClassSets] = useState<ClassSet[]>([]);
  const [selectedOption, setSelectedOption] = useState<'new' | 'existing'>('new');
  const [selectedClassSetId, setSelectedClassSetId] = useState<string>('');
  const [newClasses, setNewClasses] = useState<ClassDef[]>(initialClasses);
  const [loading, setLoading] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newClassSetName, setNewClassSetName] = useState('');
  const [newClassSetDescription, setNewClassSetDescription] = useState('');

  // Fetch available class sets
  useEffect(() => {
    fetchClassSets();
  }, []);

  const fetchClassSets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/class-sets');
      const data = await response.json();
      
      if (data.success) {
        setClassSets(data.classSets);
      }
    } catch (error) {
      console.error('Error fetching class sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (option: 'new' | 'existing') => {
    setSelectedOption(option);
    
    if (option === 'new') {
      onClassSetSelect(null, newClasses);
    } else if (selectedClassSetId) {
      const selectedSet = classSets.find(set => set.id === selectedClassSetId);
      if (selectedSet) {
        onClassSetSelect(selectedClassSetId, selectedSet.classes);
      }
    }
  };

  const handleClassSetSelect = (classSetId: string) => {
    setSelectedClassSetId(classSetId);
    const selectedSet = classSets.find(set => set.id === classSetId);
    
    if (selectedSet) {
      onClassSetSelect(classSetId, selectedSet.classes);
    }
  };

  const addNewClass = () => {
    const newClass: ClassDef = {
      id: newClasses.length,
      name: `Class ${newClasses.length + 1}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    const updatedClasses = [...newClasses, newClass];
    setNewClasses(updatedClasses);
    
    if (selectedOption === 'new') {
      onClassSetSelect(null, updatedClasses);
    }
  };

  const updateClass = (index: number, field: 'name' | 'color', value: string) => {
    const updatedClasses = newClasses.map((cls, i) => 
      i === index ? { ...cls, [field]: value } : cls
    );
    
    setNewClasses(updatedClasses);
    
    if (selectedOption === 'new') {
      onClassSetSelect(null, updatedClasses);
    }
  };

  const removeClass = (index: number) => {
    const updatedClasses = newClasses.filter((_, i) => i !== index);
    setNewClasses(updatedClasses);
    
    if (selectedOption === 'new') {
      onClassSetSelect(null, updatedClasses);
    }
  };

  const createNewClassSet = async () => {
    if (!newClassSetName.trim() || newClasses.length === 0) {
      alert('Please provide class set name and at least one class');
      return;
    }

    try {
      const response = await fetch('/api/class-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassSetName,
          description: newClassSetDescription,
          classes: newClasses
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setClassSets([...classSets, data.classSet]);
        setShowCreateNew(false);
        setNewClassSetName('');
        setNewClassSetDescription('');
        alert('Class set created successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating class set:', error);
      alert('Failed to create class set');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Class Configuration</h3>
      
      {/* Option Selection */}
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="classOption"
            value="new"
            checked={selectedOption === 'new'}
            onChange={() => handleOptionChange('new')}
            className="text-[hsl(var(--brand-green-base))]"
          />
          <span>Create new class list</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="classOption"
            value="existing"
            checked={selectedOption === 'existing'}
            onChange={() => handleOptionChange('existing')}
            className="text-[hsl(var(--brand-green-base))]"
          />
          <span>Use existing class list from another project</span>
        </label>
      </div>

      {/* Existing Class Sets */}
      {selectedOption === 'existing' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Select Class Set:</label>
          {loading ? (
            <div className="text-gray-500">Loading class sets...</div>
          ) : classSets.length === 0 ? (
            <div className="text-gray-500">No class sets available. Create a new one first.</div>
          ) : (
            <select
              value={selectedClassSetId}
              onChange={(e) => handleClassSetSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a class set...</option>
              {classSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name} ({set.classes.length} classes, used by {set.projectCount} projects)
                </option>
              ))}
            </select>
          )}
          
          {selectedClassSetId && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-2">Preview:</div>
              {classSets.find(set => set.id === selectedClassSetId)?.classes.map((cls, index) => (
                <div key={index} className="flex items-center space-x-2 mb-1">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: cls.color }}
                  ></div>
                  <span className="text-sm">{cls.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Classes Editor */}
      {selectedOption === 'new' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium">Create Classes:</label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={addNewClass}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add Class
              </button>
              <button
                type="button"
                onClick={() => setShowCreateNew(true)}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Save as Template
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {newClasses.map((cls, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={cls.name}
                  onChange={(e) => updateClass(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Class name"
                />
                <input
                  type="color"
                  value={cls.color}
                  onChange={(e) => updateClass(index, 'color', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeClass(index)}
                  className="px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            
            {newClasses.length === 0 && (
              <div className="text-gray-500 text-center py-4">
                No classes yet. Click &quot;Add Class&quot; to start.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Class Set Modal */}
      {showCreateNew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Save Class Set as Template</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name:</label>
                <input
                  type="text"
                  value={newClassSetName}
                  onChange={(e) => setNewClassSetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Vehicle Detection Classes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional):</label>
                <textarea
                  value={newClassSetDescription}
                  onChange={(e) => setNewClassSetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Describe this class set..."
                />
              </div>
              
              <div className="text-sm text-gray-600">
                This will save your current {newClasses.length} classes as a reusable template.
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateNew(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createNewClassSet}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
