import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { FiltersBar } from '@/components/resources/FiltersBar';
import { AddResourceModal } from '@/components/resources/AddResourceModal';
import { Resource } from '@/types';

const SUBJECTS = ['Mathematics', 'Physics', 'English', 'History', 'Chemistry', 'Biology'];

const DUMMY_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Algebra Formulas Cheat Sheet',
    subject: 'Mathematics',
    type: 'pdf',
    description: 'Complete collection of algebra formulas including quadratic equations, factoring, and polynomial operations.',
    url: 'https://example.com/algebra.pdf',
  },
  {
    id: '2',
    title: 'Physics Notes - Mechanics',
    subject: 'Physics',
    type: 'link',
    description: 'Comprehensive notes covering Newton\'s laws, motion, forces, and energy conservation principles.',
    url: 'https://example.com/physics-notes',
  },
  {
    id: '3',
    title: 'English Literature Summary',
    subject: 'English',
    type: 'pdf',
    description: 'Summary of major literary works including Shakespeare, Dickens, and modern literature analysis.',
    url: 'https://example.com/literature.pdf',
  },
  {
    id: '4',
    title: 'History Chapter 3 - World War II',
    subject: 'History',
    type: 'video',
    description: 'Video lecture covering the causes, major events, and aftermath of World War II.',
    url: 'https://example.com/history-ww2',
  },
  {
    id: '5',
    title: 'Chemistry Lab Manual',
    subject: 'Chemistry',
    type: 'document',
    description: 'Step-by-step guide for common chemistry experiments with safety protocols and expected results.',
    url: 'https://example.com/chem-lab.docx',
  },
  {
    id: '6',
    title: 'Biology Cell Structure Guide',
    subject: 'Biology',
    type: 'pdf',
    description: 'Detailed diagrams and explanations of cell organelles, their functions, and cellular processes.',
    url: 'https://example.com/biology-cells.pdf',
  },
];

export const ResourcesView: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>(DUMMY_RESOURCES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Resources & Materials</h1>
            <p className="text-sm text-muted-foreground">Browse and manage your study materials</p>
          </div>
        </div>
        <AddResourceModal onAddResource={handleAddResource} subjects={SUBJECTS} />
      </div>

      <div className="mb-6">
        <FiltersBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          subjects={SUBJECTS}
        />
      </div>

      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No resources found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || selectedSubject !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first resource to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
};
