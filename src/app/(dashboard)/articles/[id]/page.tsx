'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft,
    Clock,
    Tag,
    Share2,
    MessageCircle,
    Sparkles,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function ArticleDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [relatedArticles, setRelatedArticles] = useState<any[]>([]);

    useEffect(() => {
        const fetchArticleData = async () => {
            setLoading(true);
            try {
                // Fetch daily if ID is 'daily' or generic insight
                if (id === 'daily' && user) {
                    const res = await fetch(`/api/articles?type=daily&userId=${user.username}`);
                    const data = await res.json();
                    if (data.success) setArticle(data.article);
                } else {
                    // For hackathon, we'll try to find it in the list or use a stub
                    const listRes = await fetch('/api/articles?type=list');
                    const listData = await listRes.json();
                    if (listData.success) {
                        const found = listData.articles.find((a: any) => a.id === id);
                        if (found) {
                            // If it's a stub, we'll "generate" its content or use fallback
                            setArticle({
                                ...found,
                                body: "Proper women's health education is essential for managing your well-being. This article explores the details of " + found.title + " and how it relates to your specific hormonal profile. Understanding these patterns allows for better lifestyle choices, from nutrition to exercise.",
                                tips: ["Consistency is key", "Monitor your symptoms daily", "Consult with experts"]
                            });
                        } else {
                            // Default stub
                            setArticle({
                                title: "Health Insight",
                                tagline: "Expert advice for your wellness",
                                body: "Loading detailed content for this topic. Please stay tuned as we expand our health library with more curated content.",
                                tips: ["Stay hydrated", "Get enough sleep", "Track your cycle"]
                            });
                        }
                        // Set related
                        setRelatedArticles(listData.articles.filter((a: any) => a.id !== id).slice(0, 3));
                    }
                }
            } catch (error) {
                console.error('Error fetching article:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticleData();
    }, [id, user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-text-secondary animate-pulse">Fetching article...</p>
            </div>
        );
    }

    if (!article) return <div className="text-center py-20">Article not found</div>;

    const handleAriaChat = () => {
        const message = `I just read about ${article.title}. Can you tell me more about it given my specific cycle and health conditions?`;
        // Navigate to chat with pre-filled message
        router.push(`/chat?message=${encodeURIComponent(message)}`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Navigation & Actions */}
            <div className="flex items-center justify-between">
                <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors">
                    <ArrowLeft size={16} /> Back to Library
                </Link>
                <button className="p-2 rounded-xl bg-surface-elevated hover:bg-primary/10 text-text-secondary hover:text-primary transition-all">
                    <Share2 size={20} />
                </button>
            </div>

            {/* Article Content */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                            {article.category?.replace('_', ' ')}
                        </span>
                        {article.phase && (
                            <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full">
                                {article.phase} Phase
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Clock size={14} /> 5 min read
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-text-primary leading-tight">
                        {article.title}
                    </h1>
                    <p className="text-xl text-text-secondary italic">
                        {article.tagline}
                    </p>
                </div>

                <div className="prose prose-teal max-w-none">
                    <p className="text-lg text-text-primary leading-relaxed whitespace-pre-wrap">
                        {article.body}
                    </p>
                </div>

                {/* Key Tips Section */}
                {article.tips && article.tips.length > 0 && (
                    <Card className="border-none bg-surface-elevated/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-success" />
                                Actionable Tips
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {article.tips.map((tip: string, i: number) => (
                                    <div key={i} className="p-4 rounded-xl bg-background border border-border/50 flex flex-col gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                            {i + 1}
                                        </span>
                                        <p className="text-sm font-medium">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Discuss with Aria CTA */}
                <Card className="border-none bg-gradient-to-r from-primary to-accent text-white overflow-hidden relative shadow-xl shadow-primary/20">
                    <CardContent className="p-8">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
                            <div className="flex-1 space-y-2 text-center md:text-left">
                                <h3 className="text-2xl font-bold">Have questions about this?</h3>
                                <p className="text-white/80">
                                    Aria can explain how this specifically affects you based on your logged symptoms and health profile.
                                </p>
                            </div>
                            <Button
                                onClick={handleAriaChat}
                                size="lg"
                                className="bg-white text-primary hover:bg-white/90 shadow-lg"
                                leftIcon={<MessageCircle size={20} />}
                            >
                                Discuss with Aria
                            </Button>
                        </div>
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8 blur-xl"></div>
                        <Sparkles className="absolute top-4 left-4 text-white/20 w-8 h-8 rotate-12" />
                    </CardContent>
                </Card>
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
                <div className="space-y-6 pt-8 border-t border-border">
                    <h2 className="text-2xl font-bold">Related Articles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {relatedArticles.map((rel) => (
                            <Link key={rel.id} href={`/articles/${rel.id}`}>
                                <Card hover className="h-full group">
                                    <CardContent className="p-5">
                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">
                                            {rel.category}
                                        </span>
                                        <h4 className="font-bold text-text-primary group-hover:text-primary transition-colors">
                                            {rel.title}
                                        </h4>
                                        <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                                            {rel.tagline}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-[10px] text-text-muted flex items-center gap-1">
                                                <Clock size={10} /> 5 min
                                            </span>
                                            <ChevronRight size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
