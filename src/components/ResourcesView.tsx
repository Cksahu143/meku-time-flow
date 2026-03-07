import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Trash2, AlertTriangle, Star, Tag, Filter, Loader2 } from 'lucide-react';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { FiltersBar } from '@/components/resources/FiltersBar';
import { AddResourceModal } from '@/components/resources/AddResourceModal';
import { EditResourceModal } from '@/components/resources/EditResourceModal';
import { RESOURCE_CATEGORIES } from '@/types';
import { PageTransition } from '@/components/motion/PageTransition';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useResources, DbResource, ResourceInput } from '@/hooks/useResources';

const SUBJECTS = ['Mathematics', 'Physics', 'English', 'History', 'Chemistry', 'Biology'];

export const ResourcesView: React.FC = () => {
  const {
    resources,
    loading,
    addResource,
    updateResource,
    deleteResource,
    toggleFavorite,
    deleteAllResources,
  } = useResources();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [editingResource, setEditingResource] = useState<DbResource | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { toast } = useToast();

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === 'all' || resource.subject === selectedSubject;
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && resource.is_favorite);
    return matchesSearch && matchesSubject && matchesCategory && matchesTab;
  });

  const favoriteCount = resources.filter(r => r.is_favorite).length;

  const handleAddResource = async (input: ResourceInput, file?: File | null) => {
    const success = await addResource(input, file);
    if (success) {
      toast({ title: 'Resource added', description: 'Your resource has been saved.' });
    }
  };

  const handleEditResource = (resource: DbResource) => {
    setEditingResource(resource);
    setEditModalOpen(true);
  };

  const handleSaveResource = async (id: string, input: Partial<ResourceInput>, file?: File | null) => {
    const success = await updateResource(id, input, file);
    if (success) {
      toast({ title: 'Resource updated', description: 'Your changes have been saved.' });
    }
  };

  const handleDeleteResource = async (id: string) => {
    const success = await deleteResource(id);
    if (success) {
      toast({ title: 'Resource deleted', description: 'The resource has been removed.' });
    }
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
  };

  const handleDeleteAllResources = async () => {
    const success = await deleteAllResources();
    if (success) {
      toast({ title: 'All resources deleted', description: 'All resources have been removed.' });
    }
  };

  const allTags = [...new Set(resources.flatMap(r => r.tags || []))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            className="p-2.5 rounded-xl bg-primary/10"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <BookOpen className="h-6 w-6 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Resources & Materials</h1>
            <p className="text-sm text-muted-foreground">Browse and manage your study materials</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {resources.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" className="gap-2 text-destructive hover:text-destructive rounded-xl border-border/30">
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

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-4"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="all" className="gap-2">
              <BookOpen className="h-4 w-4" />
              All ({resources.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              Favorites ({favoriteCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Filters */}
      <motion.div className="mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          subjects={SUBJECTS}
        />
      </motion.div>

      {/* Category Filter */}
      <motion.div className="flex flex-wrap gap-2 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer transition-all hover:scale-105"
          onClick={() => setSelectedCategory('all')}
        >
          <Filter className="h-3 w-3 mr-1" />
          All Categories
        </Badge>
        {RESOURCE_CATEGORIES.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </motion.div>

      {/* Tags */}
      {allTags.length > 0 && (
        <motion.div className="flex flex-wrap gap-1 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mr-2">
            <Tag className="h-3 w-3" />
            Tags:
          </span>
          {allTags.slice(0, 10).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => setSearchQuery(tag)}
            >
              #{tag}
            </Badge>
          ))}
          {allTags.length > 10 && (
            <Badge variant="secondary" className="text-xs">+{allTags.length - 10} more</Badge>
          )}
        </motion.div>
      )}

      {/* Resources Grid */}
      <AnimatePresence mode="popLayout">
        {filteredResources.length === 0 ? (
          <motion.div className="text-center py-16" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              {activeTab === 'favorites' ? (
                <Star className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              ) : (
                <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              )}
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {activeTab === 'favorites' ? 'No favorites yet' : 'No resources found'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeTab === 'favorites'
                ? 'Star some resources to add them to favorites'
                : searchQuery || selectedSubject !== 'all' || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first resource to get started'}
            </p>
            {!searchQuery && selectedSubject === 'all' && selectedCategory === 'all' && activeTab === 'all' && (
              <AddResourceModal onAddResource={handleAddResource} subjects={SUBJECTS} />
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((resource) => (
              <ResourceCard 
                key={resource.id} 
                resource={resource}
                onEdit={handleEditResource}
                onDelete={handleDeleteResource}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {filteredResources.length > 0 && (
        <motion.p className="text-sm text-muted-foreground text-center mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
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
