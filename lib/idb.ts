import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project } from './types';

interface YoloLabelDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: {
      'by-name': string;
      'by-updated': number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

let db: IDBPDatabase<YoloLabelDB> | null = null;

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBPDatabase<YoloLabelDB>> {
  if (db) {
    console.log('Using existing database connection');
    return db;
  }

  try {
    console.log('Initializing IndexedDB database...');
    db = await openDB<YoloLabelDB>('yolo-label-generator', 1, {
      upgrade(db) {
        console.log('Upgrading database schema...');
        // Projects store
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-name', 'name');
        projectStore.createIndex('by-updated', 'updatedAt');

        // Settings store
        db.createObjectStore('settings', { keyPath: 'key' });
        console.log('Database schema upgraded successfully');
      },
    });
    console.log('IndexedDB database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

/**
 * Save project to IndexedDB
 */
export async function saveProject(project: Project): Promise<void> {
  try {
    console.log('Saving project to IndexedDB:', project.id, project.name);
    const database = await initDB();
    
    // Update timestamp
    const updatedProject = {
      ...project,
      updatedAt: Date.now(),
    };

    await database.put('projects', updatedProject);
    console.log('Project saved successfully to IndexedDB');
  } catch (error) {
    console.error('Error saving project to IndexedDB:', error);
    throw error;
  }
}

/**
 * Load project from IndexedDB
 */
export async function loadProject(projectId: string): Promise<Project | null> {
  const database = await initDB();
  const project = await database.get('projects', projectId);
  return project || null;
}

/**
 * Get all projects from IndexedDB
 */
export async function getAllProjects(): Promise<Project[]> {
  try {
    console.log('Initializing database for getAllProjects...');
    const database = await initDB();
    console.log('Database initialized, getting all projects...');
    const projects = await database.getAll('projects');
    console.log('Retrieved projects from IndexedDB:', projects);
    return projects;
  } catch (error) {
    console.error('Error in getAllProjects:', error);
    throw error;
  }
}

/**
 * Delete project from IndexedDB
 */
export async function deleteProject(projectId: string): Promise<void> {
  const database = await initDB();
  await database.delete('projects', projectId);
}

/**
 * Get recent projects (sorted by last updated)
 */
export async function getRecentProjects(limit = 10): Promise<Project[]> {
  const database = await initDB();
  const tx = database.transaction('projects', 'readonly');
  const index = tx.store.index('by-updated');
  
  const projects: Project[] = [];
  let cursor = await index.openCursor(null, 'prev'); // Descending order
  
  while (cursor && projects.length < limit) {
    projects.push(cursor.value);
    cursor = await cursor.continue();
  }
  
  return projects;
}

/**
 * Search projects by name
 */
export async function searchProjects(query: string): Promise<Project[]> {
  const database = await initDB();
  const allProjects = await database.getAll('projects');
  
  const lowerQuery = query.toLowerCase();
  return allProjects.filter(project => 
    project.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Save user setting
 */
export async function saveSetting(key: string, value: any): Promise<void> {
  const database = await initDB();
  await database.put('settings', { key, value });
}

/**
 * Load user setting
 */
export async function loadSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  const database = await initDB();
  const setting = await database.get('settings', key);
  return setting ? setting.value : defaultValue;
}

/**
 * Get database storage usage info
 */
export async function getStorageInfo(): Promise<{
  usage: number;
  quota: number;
  usagePercentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;
    
    return { usage, quota, usagePercentage };
  }
  
  return { usage: 0, quota: 0, usagePercentage: 0 };
}

/**
 * Clear all data (for testing/reset purposes)
 */
export async function clearAllData(): Promise<void> {
  const database = await initDB();
  
  const tx = database.transaction(['projects', 'settings'], 'readwrite');
  await Promise.all([
    tx.objectStore('projects').clear(),
    tx.objectStore('settings').clear(),
  ]);
}

/**
 * Export all projects as JSON
 */
export async function exportAllProjects(): Promise<string> {
  const projects = await getAllProjects();
  return JSON.stringify(projects, null, 2);
}

/**
 * Import projects from JSON
 */
export async function importProjects(jsonData: string): Promise<number> {
  let projects: Project[];
  
  try {
    projects = JSON.parse(jsonData);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
  
  if (!Array.isArray(projects)) {
    throw new Error('Data is not an array of projects');
  }
  
  const database = await initDB();
  const tx = database.transaction('projects', 'readwrite');
  
  let importedCount = 0;
  
  for (const project of projects) {
    // Validate project structure
    if (!project.id || !project.name || !Array.isArray(project.images)) {
      console.warn('Skipping invalid project:', project);
      continue;
    }
    
    try {
      await tx.store.put(project);
      importedCount++;
    } catch (error) {
      console.warn('Failed to import project:', project.name, error);
    }
  }
  
  return importedCount;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Backup project data to file
 */
export async function backupProject(projectId: string): Promise<Blob> {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  
  const backupData = {
    version: '1.0',
    timestamp: Date.now(),
    project,
  };
  
  return new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json',
  });
}

/**
 * Restore project from backup file
 */
export async function restoreProject(backupData: string): Promise<Project> {
  let data: any;
  
  try {
    data = JSON.parse(backupData);
  } catch (error) {
    throw new Error('Invalid backup file format');
  }
  
  if (!data.project || !data.project.id) {
    throw new Error('Invalid project data in backup');
  }
  
  const project = data.project as Project;
  await saveProject(project);
  
  return project;
}
