'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Heart,
  Shield,
  MessageCircle,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle,
  Play
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Smart Period Tracking',
    description: 'Predict your next period with AI-powered cycle analysis',
    color: 'primary',
  },
  {
    icon: MessageCircle,
    title: 'AI Health Companion',
    description: 'Get answers to health questions with empathy and care',
    color: 'accent',
  },
  {
    icon: FileText,
    title: 'Health Reports',
    description: 'Generate comprehensive reports to share with your doctor',
    color: 'secondary',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description: 'Your health data is encrypted and never shared',
    color: 'success',
  },
];

const benefits = [
  'Track symptoms daily in under 30 seconds',
  'Understand patterns with AI-powered insights',
  'Get personalized health recommendations',
  'Share reports privately with healthcare providers',
  'Available 24/7 for your health questions',
];

export default function HomePage() {
  const router = useRouter();
  const { loginAsDemo } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleTryDemo = async () => {
    setDemoLoading(true);
    try {
      await loginAsDemo();
      router.push('/dashboard');
    } catch (err) {
      console.error('Demo login failed:', err);
    } finally {
      setDemoLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="text-xl font-bold gradient-text">Ovira AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles size={16} />
            AI-Powered Women&apos;s Health
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6 leading-tight animate-slide-in-up">
            Your Compassionate{' '}
            <span className="gradient-text">Health Companion</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            Track your period, log symptoms, and get personalized health insights.
            Ovira AI is here to support your wellness journey with empathy and care.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/signup">
              <Button size="lg" rightIcon={<ChevronRight size={20} />}>
                Start Free Today
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Play size={18} />}
              onClick={handleTryDemo}
              isLoading={demoLoading}
            >
              Try Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Comprehensive tools for tracking, understanding, and improving your reproductive health
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                variant="elevated"
                hover
                className="animate-slide-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-2xl bg-${feature.color}/10 flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Health Tracking Made{' '}
                <span className="gradient-text">Simple</span>
              </h2>
              <p className="text-text-secondary mb-8">
                Ovira AI combines the latest in AI technology with a deep understanding of
                women&apos;s health needs. We&apos;re here to make tracking easier, insights smarter,
                and support more accessible.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-text-primary">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                <div className="text-center p-8">
                  <Heart className="w-20 h-20 text-primary mx-auto mb-4 animate-pulse-soft" />
                  <p className="text-xl font-semibold mb-2">Your Health, Your Data</p>
                  <p className="text-text-secondary">
                    Private, secure, and always in your control
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
          <p className="text-text-secondary mb-8">
            Join thousands of women taking control of their health with Ovira AI
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" rightIcon={<ChevronRight size={20} />}>
                Create Free Account
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Play size={18} />}
              onClick={handleTryDemo}
              isLoading={demoLoading}
            >
              Try Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">O</span>
              </div>
              <span className="font-semibold">Ovira AI</span>
            </div>
            <p className="text-sm text-text-muted text-center">
              Not a substitute for professional medical advice. Always consult a healthcare provider.
            </p>
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Ovira AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
