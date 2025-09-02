'use client';

import React, { useState, useEffect } from 'react';
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
  FolderOpen, 
  Plus, 
  FileImage, 
  Clock,
  Trash2,
  Edit,
  Calendar
} from 'lucide-react';
import { getAllProjects, deleteProject, saveProject } from '@/lib/idb';
import { Project } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { loadProject } = useLabelStore();

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load all projects on mount
  useEffect(() => {
    loadAllProjects();
  }, []);

  const loadAllProjects = async () => {
    try {
      setIsLoading(true);
      const projects = await getAllProjects();
      // Sort by updatedAt desc (most recent first)
      projects.sort((a, b) => b.updatedAt - a.updatedAt);
      setAllProjects(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    // Create basic project structure
    const newProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newProjectName.trim(),
      images: [],
      bboxes: [],
      classes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // Save to IndexedDB
      await saveProject(newProject);
      
      // Load project and navigate to labeler
      loadProject(newProject);
      setNewProjectName('');
      setIsNewProjectOpen(false);
      router.push('/labeler');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  const handleLoadProject = async (project: Project) => {
    try {
      loadProject(project);
      router.push('/labeler');
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project');
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete project "${projectName}"?`)) return;

    try {
      await deleteProject(projectId);
      await loadAllProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">YOLO Label Generator</h1>
              <p className="text-muted-foreground">Professional YOLO dataset annotation tool</p>
            </div>

            <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                      Create
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Projects</h2>
            <Button variant="ghost" size="sm" onClick={loadAllProjects}>
              <Clock className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="border rounded-lg p-8 text-center">
              <div className="text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Loading projects...</p>
              </div>
            </div>
          ) : allProjects.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <div className="text-muted-foreground">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="mb-4">Create your first project to get started with image annotation</p>
                <Button onClick={() => setIsNewProjectOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {allProjects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadProject(project)}>
                      <h3 className="font-medium text-lg">{project.name}</h3>
                      <div className="text-sm text-muted-foreground mt-2">
                        <div className="flex items-center space-x-6">
                          <span className="flex items-center">
                            <FileImage className="w-4 h-4 mr-1" />
                            {project.images.length} images
                          </span>
                          <span className="flex items-center">
                            <Edit className="w-4 h-4 mr-1" />
                            {project.bboxes.length} annotations
                          </span>
                          <span className="flex items-center">
                            <FolderOpen className="w-4 h-4 mr-1" />
                            {project.classes.length} classes
                          </span>
                        </div>
                        <div className="flex items-center mt-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Updated: {formatDate(project.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLoadProject(project)}
                        className="h-8 w-8 p-0"
                        title="Open Project"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Features Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-6">Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileImage className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Multi-format Support</h3>
                <p className="text-sm text-muted-foreground">
                  Support for JPG, PNG, WebP, and BMP image formats with cloud storage
                </p>
              </div>

              <div className="text-center p-6 border rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">YOLO Export</h3>
                <p className="text-sm text-muted-foreground">
                  Export annotations in YOLO format with train/val/test splits
                </p>
              </div>

              <div className="text-center p-6 border rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Auto-save</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic saving to browser storage with cloud backup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}