import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, CheckSquare, Clock, Layout, MessageSquare, BookOpen, 
  ArrowRight, Star, BookOpenCheck, Mic, Shield, Zap, Sparkles,
  GraduationCap, Users, ChevronRight
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/app');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const features = [
    { icon: Layout, title: "Smart Timetable", description: "Intelligent scheduling with drag-and-drop simplicity", color: "from-primary to-primary-glow" },
    { icon: BookOpen, title: "Resource Hub", description: "Organize PDFs, links, and notes in one beautiful space", color: "from-accent to-accent-glow" },
    { icon: Calendar, title: "Calendar View", description: "See deadlines and events at a glance", color: "from-success to-success/80" },
    { icon: CheckSquare, title: "Task Manager", description: "Track assignments with smart prioritization", color: "from-primary to-primary/70" },
    { icon: Clock, title: "Pomodoro Focus", description: "Boost productivity with guided focus sessions", color: "from-accent to-accent/70" },
    { icon: MessageSquare, title: "Study Groups", description: "Real-time collaboration with your classmates", color: "from-success to-success/70" },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Engineering Student", text: "EDAS completely transformed how I manage my study schedule. The Pomodoro timer alone saved my grades!", avatar: "S" },
    { name: "James M.", role: "Teacher", text: "Managing classes has never been easier. The analytics give me real insights into student engagement.", avatar: "J" },
    { name: "Priya R.", role: "Medical Student", text: "The transcription feature is a game-changer for recording lectures and reviewing notes.", avatar: "P" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 glass-effect"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <div className="p-2 rounded-xl bg-gradient-primary shadow-primary">
              <BookOpenCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="text-gradient-blue">EDAS</span>
            </span>
          </motion.div>
          
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
            </nav>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate('/auth')} className="btn-glow gap-2 font-semibold">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-16 min-h-[92vh] flex items-center">
        {/* Hero background image */}
        <div className="absolute inset-0">
          <img 
            src="/images/hero-landing.jpg" 
            alt="Modern campus at golden hour"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>

        {/* Floating orbs */}
        <motion.div
          className="absolute top-32 right-[15%] w-80 h-80 rounded-full blur-3xl opacity-30"
          style={{ background: 'hsl(var(--primary) / 0.15)' }}
          animate={{ y: [0, -40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 left-[10%] w-52 h-52 rounded-full blur-3xl opacity-20"
          style={{ background: 'hsl(var(--accent) / 0.2)' }}
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div 
          className="container mx-auto px-6 relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="max-w-2xl">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Education Platform</span>
            </motion.div>

            <motion.h1
              className="font-display text-5xl md:text-7xl font-extrabold leading-[0.95] mb-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="text-foreground">Your study life,</span>
              <br />
              <span className="text-gradient-blue">beautifully</span>
              <br />
              <span className="text-foreground">organized.</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              EDAS brings your timetable, tasks, study groups, and resources together in one stunning interface. Built for students and educators who demand more.
            </motion.p>

            <motion.div 
              className="flex flex-wrap gap-4 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="btn-glow gap-2 text-base px-8 py-6 font-semibold" onClick={() => navigate('/auth')}>
                  Start Free <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" className="gap-2 text-base px-8 py-6 font-semibold bg-card/50 backdrop-blur-sm" onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Explore Features
                </Button>
              </motion.div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex -space-x-3">
                {['S', 'J', 'P', 'A'].map((letter, i) => (
                  <motion.div
                    key={letter}
                    className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-sm font-bold"
                    style={{ background: `hsl(${225 + i * 40} 60% ${55 + i * 5}%)`, color: 'white' }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Trusted by <span className="font-semibold text-foreground">2,000+</span> students</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative bg-mesh">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent-foreground">Powerful Features</span>
            </motion.div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Everything you need to <span className="text-gradient-blue">excel</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From daily schedules to exam prep, we've built every tool to help you succeed academically
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div 
                  className="group relative bg-card rounded-2xl border border-border/40 p-6 h-full overflow-hidden"
                  whileHover={{ y: -6, transition: { duration: 0.3 } }}
                >
                  {/* Hover gradient */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-[0.04]`} />
                  </div>
                  
                  <div className="relative z-10">
                    <motion.div 
                      className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <feature.icon className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                    <h3 className="font-display text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Corner accent */}
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-16 border-y border-border/40">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '2,000+', label: 'Active Students', icon: Users },
              { value: '50+', label: 'Schools', icon: GraduationCap },
              { value: '10K+', label: 'Tasks Completed', icon: CheckSquare },
              { value: '99.9%', label: 'Uptime', icon: Shield },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-display text-3xl md:text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-mesh">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Loved by <span className="text-gradient-accent">students</span>
            </h2>
            <p className="text-muted-foreground text-lg">Hear from people who transformed their academic life</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                className="bg-card rounded-2xl border border-border/40 p-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-primary" />
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 blur-3xl translate-y-1/3 -translate-x-1/4" />
            </div>
            
            <div className="relative z-10 text-center py-20 px-8">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <GraduationCap className="w-16 h-16 text-primary-foreground/90 mx-auto mb-6" />
              </motion.div>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4 tracking-tight">
                Ready to transform your studies?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-lg mx-auto">
                Join thousands of students already achieving more with EDAS
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg"
                  variant="secondary"
                  className="text-lg px-10 py-7 gap-2 font-bold shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <BookOpenCheck className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">EDAS</span>
              <span className="text-sm text-muted-foreground">Education Assist</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 EDAS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
