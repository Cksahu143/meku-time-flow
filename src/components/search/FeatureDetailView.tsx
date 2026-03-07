/**
 * FeatureDetailView
 * Displays a detailed guide page for a selected feature.
 * Shows overview, step-by-step instructions, and pro tips.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, CheckCircle2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import type { FeatureItem } from '@/data/featureRegistry';

interface FeatureDetailViewProps {
  feature: FeatureItem;
  onBack: () => void;
  onGoToFeature: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

const categoryLabels: Record<string, string> = {
  core: 'Core Feature',
  collaboration: 'Collaboration',
  admin: 'Administration',
  utility: 'Utility',
};

export const FeatureDetailView: React.FC<FeatureDetailViewProps> = ({
  feature,
  onBack,
  onGoToFeature,
}) => {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto p-6 space-y-6"
    >
      {/* Back button */}
      <motion.div variants={itemVariants}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{feature.label}</h1>
            <Badge variant="outline" className="text-xs">
              {categoryLabels[feature.category]}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{feature.description}</p>
        </div>
      </motion.div>

      <Separator />

      {/* Overview */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Overview</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.guide.overview}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* How to Use */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">How to Use</h2>
            </div>
            <div className="space-y-3">
              {feature.guide.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{step}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pro Tips */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/15 bg-primary/3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Pro Tips</h2>
            </div>
            <ul className="space-y-2.5">
              {feature.guide.tips.map((tip, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-primary mt-1">💡</span>
                  <span className="text-foreground/80">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA */}
      {(feature.viewTarget || feature.route) && (
        <motion.div variants={itemVariants} className="flex justify-center pt-2">
          <Button
            onClick={onGoToFeature}
            size="lg"
            className="gap-2 rounded-xl px-8 shadow-lg"
          >
            Open {feature.label}
            <Icon className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};
