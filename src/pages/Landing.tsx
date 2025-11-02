import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckSquare, Clock, Layout, MessageSquare } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Layout className="w-12 h-12 text-primary" />,
      title: "Smart Timetable",
      description: "Create and manage your class schedules with an intuitive visual interface"
    },
    {
      icon: <Calendar className="w-12 h-12 text-accent" />,
      title: "Calendar View",
      description: "See all your events and deadlines in a comprehensive calendar layout"
    },
    {
      icon: <CheckSquare className="w-12 h-12 text-success" />,
      title: "Task Management",
      description: "Keep track of assignments and tasks with our integrated todo system"
    },
    {
      icon: <Clock className="w-12 h-12 text-primary-glow" />,
      title: "Pomodoro Timer",
      description: "Boost productivity with built-in focus timer and break reminders"
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-accent" />,
      title: "Group Chats",
      description: "Collaborate with classmates in real-time group conversations"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            EducationAssist
          </h1>
          <Button onClick={() => navigate('/auth')} className="shadow-md">
            Sign In / Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Your Ultimate School Planner
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Organize your academic life with powerful tools for scheduling, task management, and productivity tracking
        </p>
        <Button 
          onClick={() => navigate('/auth')} 
          size="lg" 
          className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          Get Started Free
        </Button>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Everything You Need to Succeed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="max-w-2xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-3xl">Ready to Get Organized?</CardTitle>
            <CardDescription className="text-lg">
              Join students who are already managing their academic life more effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg"
              className="text-lg px-8 py-6"
            >
              Create Your Account
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 EducationAssist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
