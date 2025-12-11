import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckSquare, Clock, Layout, MessageSquare, BookOpen, GraduationCap, Users, Sparkles, ArrowRight, Star } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Layout className="w-10 h-10" />,
      title: "Smart Timetable",
      description: "Create and manage your class schedules with an intuitive visual interface",
      color: "text-primary",
    },
    {
      icon: <BookOpen className="w-10 h-10" />,
      title: "Exam Calendar",
      description: "Track all your exams and tests with multi-day support and reminders",
      color: "text-destructive",
    },
    {
      icon: <Calendar className="w-10 h-10" />,
      title: "Calendar View",
      description: "See all your events and deadlines in a comprehensive calendar layout",
      color: "text-accent-foreground",
    },
    {
      icon: <CheckSquare className="w-10 h-10" />,
      title: "Task Management",
      description: "Keep track of assignments and tasks with our integrated todo system",
      color: "text-primary",
    },
    {
      icon: <Clock className="w-10 h-10" />,
      title: "Pomodoro Timer",
      description: "Boost productivity with built-in focus timer and break reminders",
      color: "text-destructive",
    },
    {
      icon: <MessageSquare className="w-10 h-10" />,
      title: "Group Chats",
      description: "Collaborate with classmates in real-time group conversations",
      color: "text-primary",
    }
  ];

  const highlights = [
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "Built for Students",
      description: "Designed specifically for academic success"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Collaborate",
      description: "Share timetables and work together"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Stay Organized",
      description: "Never miss an exam or deadline"
    }
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
        className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <GraduationCap className="w-8 h-8 text-primary" />
            EducationAssist
          </motion.h1>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate('/auth')} className="shadow-md gap-2">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl"
          animate={{ y: [0, 20, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        
        <div className="relative z-10">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Your Complete School Companion
          </motion.div>
          
          <motion.h2 
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Your Ultimate
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
              School Planner
            </span>
          </motion.h2>
          
          <motion.p 
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Organize your academic life with powerful tools for scheduling, exam tracking, task management, and productivity
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => navigate('/auth')} 
                size="lg" 
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline"
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="container mx-auto px-4 py-12">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {highlights.map((item, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg group"
              whileHover={{ y: -4 }}
            >
              <motion.div 
                className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                whileHover={{ rotate: 10 }}
              >
                {item.icon}
              </motion.div>
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 py-16">
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
              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group h-full">
                <CardHeader>
                  <motion.div 
                    className={`mb-4 ${feature.color}`}
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
          <Card className="max-w-2xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
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
                  className="text-lg px-8 py-6 gap-2"
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
      <footer className="border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 EducationAssist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
