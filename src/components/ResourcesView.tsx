import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Trash2, AlertTriangle } from 'lucide-react';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { FiltersBar } from '@/components/resources/FiltersBar';
import { AddResourceModal } from '@/components/resources/AddResourceModal';
import { EditResourceModal } from '@/components/resources/EditResourceModal';
import { Resource } from '@/types';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/motion/PageTransition';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const SUBJECTS = ['Mathematics', 'Physics', 'English', 'History', 'Chemistry', 'Biology'];

const DUMMY_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Algebra Formulas Cheat Sheet',
    subject: 'Mathematics',
    type: 'pdf',
    description: 'Complete collection of algebra formulas including quadratic equations, factoring, and polynomial operations.',
    url: 'https://example.com/algebra.pdf',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Physics Notes - Mechanics',
    subject: 'Physics',
    type: 'link',
    description: 'Comprehensive notes covering Newton\'s laws, motion, forces, and energy conservation principles.',
    url: 'https://example.com/physics-notes',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'English Literature Summary',
    subject: 'English',
    type: 'pdf',
    description: 'Summary of major literary works including Shakespeare, Dickens, and modern literature analysis.',
    url: 'https://example.com/literature.pdf',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'History Chapter 3 - World War II',
    subject: 'History',
    type: 'video',
    description: 'Video lecture covering the causes, major events, and aftermath of World War II.',
    url: 'https://example.com/history-ww2',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Chemistry Lab Manual',
    subject: 'Chemistry',
    type: 'document',
    description: 'Step-by-step guide for common chemistry experiments with safety protocols and expected results.',
    url: 'https://example.com/chem-lab.docx',
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'Biology Cell Structure Guide',
    subject: 'Biology',
    type: 'pdf',
    description: 'Detailed diagrams and explanations of cell organelles, their functions, and cellular processes.',
    url: 'https://example.com/biology-cells.pdf',
    createdAt: new Date().toISOString(),
  },
];

export const ResourcesView: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>(DUMMY_RESOURCES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { toast } = useToast();

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || resource.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleAddResource = (newResource: Omit<Resource, 'id'>) => {
    const resource: Resource = {
      ...newResource,
      id: Date.now().toString(),
    };
    setResources((prev) => [resource, ...prev]);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setEditModalOpen(true);
  };

  const handleSaveResource = (updatedResource: Resource) => {
    setResources((prev) =>
      prev.map((r) => (r.id === updatedResource.id ? updatedResource : r))
    );
  };

  const handleDeleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    toast({
      title: 'Resource deleted',
      description: 'The resource has been removed.',
    });
  };

  const handleDeleteAllResources = () => {
    setResources([]);
    toast({
      title: 'All resources deleted',
      description: 'All dummy resources have been removed.',
    });
  };

  return (
    <PageTransition className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            className="p-3 bg-primary/10 rounded-xl"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <BookOpen className="h-6 w-6 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Resources & Materials</h1>
            <p className="text-sm text-muted-foreground">Browse and manage your study materials</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {resources.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete All
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete All Resources
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete all {resources.length} resources? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllResources}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AddResourceModal onAddResource={handleAddResource} subjects={SUBJECTS} />
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          subjects={SUBJECTS}
        />
      </motion.div>

      {/* Resources Grid */}
      <AnimatePresence mode="popLayout">
        {filteredResources.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-1">No resources found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || selectedSubject !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first resource to get started'}
            </p>
            {!searchQuery && selectedSubject === 'all' && (
              <AddResourceModal onAddResource={handleAddResource} subjects={SUBJECTS} />
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource, index) => (
              <ResourceCard 
                key={resource.id} 
                resource={resource}
                onEdit={handleEditResource}
                onDelete={handleDeleteResource}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Resource count */}
      {filteredResources.length > 0 && (
        <motion.p 
          className="text-sm text-muted-foreground text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Showing {filteredResources.length} of {resources.length} resources
        </motion.p>
      )}

      {/* Edit Modal */}
      <EditResourceModal
        resource={editingResource}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleSaveResource}
        subjects={SUBJECTS}
      />
    </PageTransition>
  );
};
