import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  CheckSquare, 
  Clock, 
  Layout, 
  MessageSquare, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Star,
  BookOpenCheck,
  Mic,
  Upload,
  Link2,
  Shield,
  FileText
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Layout className="w-8 h-8" />,
      title: "Smart Timetable",
      description: "Create and manage your class schedules with an intuitive visual interface",
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Resources Tab",
      description: "Store and organize all your study materials, PDFs, links, and notes",
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Calendar View",
      description: "See all your events and deadlines in a comprehensive calendar layout",
    },
    {
      icon: <CheckSquare className="w-8 h-8" />,
      title: "Task Management",
      description: "Keep track of assignments and tasks with our integrated todo system",
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Pomodoro Timer",
      description: "Boost productivity with built-in focus timer and break reminders",
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Group Chats",
      description: "Collaborate with classmates in real-time group conversations",
    }
  ];

  const stats = [
    { value: '2,340', label: 'Transcription Items', icon: FileText },
    { value: '415h', label: 'Minutes processed', icon: Clock },
    { value: '140+', label: 'Study notebooks', icon: BookOpen },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <motion.header 
        className="border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md btn-glow">
              <BookOpenCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-gradient-blue">Cohen</span>
                <span className="text-foreground"> - EDAS</span>
              </h1>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#" className="text-foreground hover:text-primary transition-colors">Home</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Add Resource</a>
            </nav>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate('/auth')} className="shadow-md gap-2 btn-glow">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 relative">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        
        {/* Floating decorative elements */}
        <motion.div
          className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
          animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-10 left-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div 
              className="flex items-center gap-2 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
                <BookOpenCheck className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>
            
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-gradient-blue">Cohen</span>
              <span className="text-foreground"> - EDAS</span>
            </motion.h2>
            
            <motion.p 
              className="text-lg text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Your AI-powered school companion
            </motion.p>
            
            <motion.p 
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              Convert audio, video, or links into English study notes.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-wrap gap-3 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="gap-2 btn-glow" onClick={() => navigate('/auth')}>
                  <Upload className="w-4 h-4" />
                  Upload Audio/Video
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" className="gap-2">
                  <Link2 className="w-4 h-4" />
                  Paste URL
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Explore Resources
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="flex flex-wrap gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <stat.icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Security Note */}
            <motion.div
              className="flex items-center gap-3 mt-6 p-3 rounded-xl bg-secondary/50 border border-border/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Shield className="h-5 w-5 text-success" />
              <div className="text-sm">
                <span className="font-medium text-foreground">No permanent storage</span>
                <span className="text-muted-foreground"> • No resale or retainability</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Image Area - Decorative Cards */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="relative w-full h-[400px]">
              {/* Floating cards */}
              <motion.div
                className="absolute top-0 right-0 w-48 h-32 bg-card rounded-2xl border border-border/50 shadow-lg p-4"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Mic className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Transcribing...</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-primary/20 rounded-full w-full" />
                  <div className="h-2 bg-primary/10 rounded-full w-3/4" />
                </div>
              </motion.div>

              <motion.div
                className="absolute top-20 left-0 w-56 h-40 bg-card rounded-2xl border border-border/50 shadow-lg p-4"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    <FileText className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-medium">Notes Ready</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full w-full" />
                  <div className="h-2 bg-muted rounded-full w-5/6" />
                  <div className="h-2 bg-muted rounded-full w-4/5" />
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-10 right-10 w-44 h-28 bg-card rounded-2xl border border-border/50 shadow-lg p-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Study Materials</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 py-16 bg-secondary/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h3 className="text-3xl font-bold mb-4">Everything You Need to Succeed</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From daily schedules to exam preparation, we've got all the tools to help you excel academically
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg group h-full bg-card">
                <CardHeader>
                  <motion.div 
                    className="mb-4 text-primary"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Card className="max-w-2xl mx-auto border border-primary/20 bg-card overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardHeader className="relative">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              </motion.div>
              <CardTitle className="text-3xl">Ready to Get Organized?</CardTitle>
              <CardDescription className="text-lg">
                Join students who are already managing their academic life more effectively
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg"
                  className="text-lg px-8 py-6 gap-2 btn-glow"
                >
                  Create Your Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Cohen-EDAS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;