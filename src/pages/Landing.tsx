import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, useSpring, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, CheckSquare, Clock, Layout, MessageSquare, BookOpen, 
  ArrowRight, Star, BookOpenCheck, Mic, Shield, Zap, Sparkles,
  GraduationCap, Users, ChevronRight, Play, ArrowUpRight
} from 'lucide-react';

// Typewriter component
const TypewriterText = ({ texts, className }: { texts: string[]; className?: string }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting' | 'waiting'>('typing');

  useEffect(() => {
    const currentFullText = texts[currentTextIndex];

    if (phase === 'typing') {
      if (displayText.length < currentFullText.length) {
        const timer = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        }, 80);
        return () => clearTimeout(timer);
      } else {
        setPhase('pausing');
      }
    }

    if (phase === 'pausing') {
      const timer = setTimeout(() => setPhase('deleting'), 2000);
      return () => clearTimeout(timer);
    }

    if (phase === 'deleting') {
      if (displayText.length > 0) {
        const timer = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 40);
        return () => clearTimeout(timer);
      } else {
        setPhase('waiting');
      }
    }

    if (phase === 'waiting') {
      const timer = setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        setPhase('typing');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [displayText, phase, currentTextIndex, texts]);

  return (
    <span className={className}>
      {displayText}
      <span className="border-r-2 border-primary ml-0.5 animate-caret">&nbsp;</span>
    </span>
  );
};

// Animated counter
const AnimatedCounter = ({ value, suffix = '' }: { value: string; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.span
      ref={ref}
      className="font-display text-3xl md:text-5xl font-extrabold text-foreground tracking-tight"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, type: 'spring' }}
    >
      {value}{suffix}
    </motion.span>
  );
};

// Floating particle for hero
const HeroParticle = ({ index }: { index: number }) => {
  const x = 10 + Math.random() * 80;
  const y = 10 + Math.random() * 80;
  const size = 3 + Math.random() * 5;
  const duration = 4 + Math.random() * 6;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: index % 3 === 0
          ? 'hsl(var(--primary) / 0.3)'
          : index % 3 === 1
          ? 'hsl(var(--accent) / 0.25)'
          : 'hsl(var(--success) / 0.2)',
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, index % 2 === 0 ? 15 : -15, 0],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay: index * 0.5,
        ease: 'easeInOut',
      }}
    />
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const navBg = useTransform(smoothProgress, [0, 0.05], [0, 1]);

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
    { icon: Layout, title: "Smart Timetable", description: "Intelligent scheduling with drag-and-drop simplicity and AI conflict detection", color: "from-primary to-primary-glow" },
    { icon: BookOpen, title: "Resource Hub", description: "Organize PDFs, links, and notes with auto-tagging and instant preview", color: "from-accent to-accent-glow" },
    { icon: Calendar, title: "Calendar View", description: "See deadlines and events at a glance with beautiful day/week views", color: "from-success to-success/80" },
    { icon: CheckSquare, title: "Task Manager", description: "Track assignments with smart prioritization and progress tracking", color: "from-primary to-primary/70" },
    { icon: Clock, title: "Pomodoro Focus", description: "Boost productivity with guided focus sessions and break reminders", color: "from-accent to-accent/70" },
    { icon: MessageSquare, title: "Study Groups", description: "Real-time collaboration with voice, files, reactions, and threading", color: "from-success to-success/70" },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Engineering Student", text: "EDAS completely transformed how I manage my study schedule. The Pomodoro timer alone saved my grades!", avatar: "S" },
    { name: "James M.", role: "Teacher", text: "Managing classes has never been easier. The analytics give me real insights into student engagement.", avatar: "J" },
    { name: "Priya R.", role: "Medical Student", text: "The transcription feature is a game-changer for recording lectures and reviewing notes.", avatar: "P" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left"
        style={{
          scaleX: smoothProgress,
          background: 'var(--gradient-primary)',
        }}
      />

      {/* Nav */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50"
        style={{ 
          backgroundColor: `hsl(var(--card) / ${navBg})`,
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid hsl(var(--border) / 0.1)',
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <motion.div 
              className="p-2 rounded-xl bg-gradient-primary relative overflow-hidden"
              style={{ boxShadow: '0 4px 16px hsl(225 85% 52% / 0.35)' }}
              whileHover={{ rotate: 5 }}
            >
              <BookOpenCheck className="w-5 h-5 text-primary-foreground relative z-10" />
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, transparent 40%, hsl(0 0% 100% / 0.2) 50%, transparent 60%)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
              />
            </motion.div>
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="text-gradient-blue">EDAS</span>
            </span>
          </motion.div>
          
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              {['Features', 'Reviews'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  {item}
                  <motion.span
                    className="absolute -bottom-1 left-0 h-0.5 bg-primary rounded-full"
                    initial={{ width: 0 }}
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.3 }}
                  />
                </a>
              ))}
            </nav>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate('/auth')} className="btn-glow btn-premium gap-2 font-semibold px-6">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative pt-16 min-h-[95vh] flex items-center">
        <div className="absolute inset-0">
          <motion.img 
            src="/images/hero-landing.jpg" 
            alt="Modern campus at golden hour"
            className="w-full h-full object-cover"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
        </div>

        {/* Hero floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <HeroParticle key={i} index={i} />
          ))}
        </div>

        {/* Morphing orbs */}
        <motion.div
          className="absolute top-32 right-[12%] w-[400px] h-[400px] rounded-full blur-[100px] animate-morph"
          style={{ background: 'hsl(var(--primary) / 0.12)' }}
          animate={{ y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-32 left-[8%] w-[300px] h-[300px] rounded-full blur-[80px] animate-morph"
          style={{ background: 'hsl(var(--accent) / 0.1)', animationDelay: '-4s' }}
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[60%] right-[30%] w-[200px] h-[200px] rounded-full blur-[60px] animate-morph"
          style={{ background: 'hsl(var(--success) / 0.06)', animationDelay: '-2s' }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div 
          className="container mx-auto px-6 relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="max-w-2xl">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 mb-8 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-sm font-medium text-primary">AI-Powered Education Platform</span>
              <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ArrowUpRight className="w-3.5 h-3.5 text-primary/60" />
              </motion.div>
            </motion.div>

            <motion.h1
              className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.92] mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <motion.span
                className="text-foreground inline-block"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Your study life,
              </motion.span>
              <br />
              <motion.span
                className="text-gradient-blue inline-block"
                initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                beautifully
              </motion.span>
              <br />
              <motion.span
                className="text-foreground inline-block"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <TypewriterText
                  texts={['organized.', 'simplified.', 'elevated.']}
                  className="text-foreground"
                />
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              EDAS brings your timetable, tasks, study groups, and resources together in one stunning interface. Built for students and educators who demand more.
            </motion.p>

            <motion.div 
              className="flex flex-wrap gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="btn-glow btn-premium gap-2 text-base px-8 py-6 font-semibold" onClick={() => navigate('/auth')}>
                  Start Free
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" className="gap-2 text-base px-8 py-6 font-semibold bg-card/40 backdrop-blur-sm border-border/30 hover:bg-card/60" onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Play className="w-4 h-4" />
                  </motion.div>
                  See How It Works
                </Button>
              </motion.div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="flex items-center gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <div className="flex -space-x-3">
                {['S', 'J', 'P', 'A', 'M'].map((letter, i) => (
                  <motion.div
                    key={letter}
                    className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-sm font-bold shadow-md"
                    style={{ background: `hsl(${225 + i * 35} 65% ${52 + i * 4}%)`, color: 'white' }}
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 200 }}
                    whileHover={{ y: -6, scale: 1.15, zIndex: 10 }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 1.4 + i * 0.05, type: 'spring' }}
                    >
                      <Star className="w-4 h-4 fill-accent text-accent" />
                    </motion.div>
                  ))}
                  <motion.span
                    className="text-sm font-bold text-foreground ml-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.7 }}
                  >
                    4.9
                  </motion.span>
                </div>
                <p className="text-sm text-muted-foreground">Trusted by <span className="font-semibold text-foreground">2,000+</span> students</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex items-start justify-center p-2">
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 relative bg-aurora dot-pattern">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/8 border border-accent/15 mb-6 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                <Zap className="w-4 h-4 text-accent" />
              </motion.div>
              <span className="text-sm font-medium text-accent-foreground">Powerful Features</span>
            </motion.div>
            <h2 className="font-display text-4xl md:text-6xl font-extrabold mb-5 tracking-tight">
              Everything you need to <br className="hidden md:block" /><span className="text-gradient-blue">excel</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              From daily schedules to exam prep, we've built every tool to help you succeed academically
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <motion.div 
                  className="group relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 p-7 h-full overflow-hidden hover-3d-lift"
                  whileHover={{ y: -8 }}
                >
                  {/* Top highlight */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                  />
                  
                  {/* Hover gradient */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-[0.04]`} />
                  </div>
                  
                  <div className="relative z-10">
                    <motion.div 
                      className={`inline-flex p-3.5 rounded-2xl bg-gradient-to-br ${feature.color} mb-5 shadow-md`}
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <feature.icon className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                    <h3 className="font-display text-lg font-bold mb-2.5 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{feature.description}</p>
                  </div>

                  {/* Corner accent with animation */}
                  <motion.div
                    className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-primary/3"
                    whileHover={{ scale: 1.5, backgroundColor: 'hsl(var(--primary) / 0.08)' }}
                    transition={{ duration: 0.7 }}
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '2,000+', label: 'Active Students', icon: Users },
              { value: '50+', label: 'Schools', icon: GraduationCap },
              { value: '10K+', label: 'Tasks Completed', icon: CheckSquare },
              { value: '99.9%', label: 'Uptime', icon: Shield },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center group"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 200 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-md"
                  whileHover={{ scale: 1.15, rotate: 10, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
                <AnimatedCounter value={stat.value} />
                <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-28 bg-aurora">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-6xl font-extrabold mb-5 tracking-tight">
              Loved by <span className="text-gradient-accent">students</span>
            </h2>
            <p className="text-muted-foreground text-lg">Hear from people who transformed their academic life</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                className="group bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30 p-7 relative overflow-hidden hover-3d-lift"
                initial={{ opacity: 0, y: 40, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 150 }}
                whileHover={{ y: -6 }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-0.5 mb-5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 + s * 0.05, type: 'spring' }}
                    >
                      <Star className="w-4 h-4 fill-accent text-accent" />
                    </motion.div>
                  ))}
                </div>
                <p className="text-foreground mb-7 leading-relaxed text-[15px]">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {t.avatar}
                  </motion.div>
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
      <section className="py-28">
        <div className="container mx-auto px-6">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow" />
            <div className="absolute inset-0">
              <motion.div
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/10 blur-[100px]"
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transform: 'translate(33%, -50%)' }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-[80px]"
                animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transform: 'translate(-25%, 33%)' }}
              />
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '32px 32px'
              }} />
            </div>
            
            <div className="relative z-10 text-center py-24 px-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              >
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm mx-auto mb-8 flex items-center justify-center border border-white/20"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <GraduationCap className="w-10 h-10 text-primary-foreground" />
                </motion.div>
              </motion.div>
              <motion.h2
                className="font-display text-3xl md:text-6xl font-extrabold text-primary-foreground mb-5 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Ready to transform<br className="hidden md:block" /> your studies?
              </motion.h2>
              <motion.p
                className="text-primary-foreground/75 text-lg mb-10 max-w-lg mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                Join thousands of students already achieving more with EDAS
              </motion.p>
              <motion.div
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg"
                  variant="secondary"
                  className="text-lg px-10 py-7 gap-2.5 font-bold shadow-2xl btn-premium"
                >
                  Get Started Free
                  <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-14 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="p-2 rounded-xl bg-gradient-primary shadow-md"
                whileHover={{ rotate: 10, scale: 1.1 }}
              >
                <BookOpenCheck className="w-4 h-4 text-primary-foreground" />
              </motion.div>
              <span className="font-display font-bold text-foreground">EDAS</span>
              <span className="text-sm text-muted-foreground font-medium">Education Assist</span>
            </motion.div>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              © {new Date().getFullYear()} EDAS. All rights reserved.
            </motion.p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;