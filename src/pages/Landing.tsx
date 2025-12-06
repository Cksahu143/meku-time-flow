import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckSquare, Clock, Layout, MessageSquare, BookOpen, GraduationCap, Users } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Layout className="w-12 h-12 text-primary" />,
      title: "Smart Timetable",
      description: "Create and manage your class schedules with an intuitive visual interface"
    },
    {
      icon: <BookOpen className="w-12 h-12 text-destructive" />,
      title: "Exam Calendar",
      description: "Track all your exams and tests with multi-day support and automatic reminders"
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

  const highlights = [
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "Built for Students",
      description: "Designed specifically for academic success"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Collaborate",
      description: "Share timetables and work together"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Stay Organized",
      description: "Never miss an exam or deadline"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            EducationAssist
          </h1>
          <Button onClick={() => navigate('/auth')} className="shadow-md">
            Sign In / Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            Now with Exam & Test Calendar
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Your Ultimate School Planner
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Organize your academic life with powerful tools for scheduling, exam tracking, task management, and productivity
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg" 
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              Get Started Free
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-4">Everything You Need to Succeed</h3>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From daily schedules to exam preparation, we've got all the tools to help you excel academically
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary transition-colors hover:shadow-lg group">
              <CardHeader>
                <div className="mb-4 transform group-hover:scale-110 transition-transform">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Exam Feature Highlight */}
      <section className="container mx-auto px-4 py-16">
        <Card className="border-2 border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4 w-fit">
                <BookOpen className="w-4 h-4" />
                New Feature
              </div>
              <h3 className="text-3xl font-bold mb-4">Exam & Test Calendar</h3>
              <p className="text-muted-foreground mb-6">
                Never miss an exam again. Create exams with titles, subjects, dates, and times. 
                Support for multi-day exams that span across your calendar. All changes save automatically 
                and sync in real-time.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  "Single and multi-day exam support",
                  "Automatic real-time sync",
                  "Visual calendar integration",
                  "Subject and time tracking"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                      <CheckSquare className="w-3 h-3 text-destructive" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-fit bg-destructive hover:bg-destructive/90"
              >
                Try It Now
              </Button>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-sm bg-card rounded-xl border-2 border-border p-4 shadow-lg">
                <div className="text-center mb-4">
                  <span className="text-lg font-bold">December 2025</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <div 
                      key={day} 
                      className={`aspect-square flex items-center justify-center text-xs rounded ${
                        day === 15 || day === 16 || day === 17 
                          ? 'bg-destructive/20 text-destructive font-bold' 
                          : day === 6 
                            ? 'bg-primary text-primary-foreground font-bold'
                            : ''
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs">
                  <div className="font-medium text-destructive">Math Final Exam</div>
                  <div className="text-muted-foreground">Dec 15-17 • Mathematics</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
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
