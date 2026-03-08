'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Search,
    Filter,
    BookOpen,
    ArrowRight,
    Clock,
    Tag,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: null },
    { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
    { id: 'exercise', label: 'Exercise', icon: '💪' },
    { id: 'mental_health', label: 'Mental Health', icon: '🧠' },
    { id: 'cycle_basics', label: 'Cycle Basics', icon: '🔄' },
    { id: 'conditions', label: 'Conditions', icon: '🏥' },
    { id: 'sleep', label: 'Sleep', icon: '🌙' },
];

export default function ArticlesPage() {
    const { user } = useAuth();
    const [articles, setArticles] = useState<any[]>([]);
    const [dailyArticle, setDailyArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                // Fetch list
                const listRes = await fetch('/api/articles?type=list');
                const listData = await listRes.json();
                if (listData.success) {
                    setArticles(listData.articles);
                }

                // Fetch daily for featured section
                if (user) {
                    const dailyRes = await fetch(`/api/articles?type=daily&userId=${user.username}`);
                    const dailyData = await dailyRes.json();
                    if (dailyData.success) {
                        setDailyArticle(dailyData.article);
                    }
                }
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, [user]);

    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.tagline.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Health Library</h1>
                    <p className="text-text-secondary mt-1">
                        Personalised insights and expert advice for your cycle journey
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                    />
                </div>
            </div>

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-surface-elevated text-text-secondary hover:bg-primary/10 hover:text-primary'
                            }`}
                    >
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Featured Article */}
            {dailyArticle && activeCategory === 'all' && !searchQuery && (
                <div className="animate-fade-in">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Today&apos;s Featured Insight
                    </h2>
                    <Link href={`/articles/${dailyArticle.id || 'daily'}`}>
                        <Card variant="gradient" className="overflow-hidden group border-none bg-gradient-to-br from-primary/10 via-background to-accent/10">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    <div className="flex-1 p-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                                Daily Insight
                                            </span>
                                            <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full">
                                                {dailyArticle.phase} Phase
                                            </span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">
                                            {dailyArticle.title}
                                        </h3>
                                        <p className="text-text-secondary text-lg mb-6 max-w-2xl leading-relaxed">
                                            {dailyArticle.tagline}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-text-muted">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={16} /> 5 min read
                                            </span>
                                            <span className="flex items-center gap-1.5 capitalize">
                                                <Tag size={16} /> {dailyArticle.category?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="mt-8">
                                            <Button rightIcon={<ArrowRight size={18} />}>
                                                Read Full Article
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="md:w-1/3 bg-primary/5 p-8 flex items-center justify-center border-l border-white/10">
                                        <div className="w-24 h-24 rounded-3xl bg-white/50 backdrop-blur-xl shadow-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                                            <BookOpen className="w-12 h-12 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            )}

            {/* Article Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold">
                    {activeCategory === 'all' ? 'All Articles' : `${CATEGORIES.find(c => c.id === activeCategory)?.label} Articles`}
                </h2>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 4, 5].map(i => (
                            <div key={i} className="h-48 rounded-2xl bg-surface-elevated animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredArticles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredArticles.map((article) => (
                            <Link key={article.id} href={`/articles/${article.id}`}>
                                <Card hover className="h-full overflow-hidden border-border/50 hover:border-primary/50 group">
                                    <div className="h-2 bg-gradient-to-r from-primary/50 to-accent/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-2.5 py-1 bg-surface-elevated text-text-muted text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                                {article.category?.replace('_', ' ')}
                                            </span>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-accent px-2 py-1 bg-accent/10 rounded-lg">
                                                <Sparkles size={10} />
                                                {article.phase_relevance} RELATIVE
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">
                                            {article.title}
                                        </h3>
                                        <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                                            {article.tagline}
                                        </p>
                                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                                            <span className="text-xs text-text-muted flex items-center gap-1">
                                                <Clock size={12} /> 5 min read
                                            </span>
                                            <span className="text-primary text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                                Read More <ChevronRight size={14} />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="text-text-muted w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No articles found</h3>
                        <p className="text-text-secondary">Try adjusting your filters or search query.</p>
                        <Button
                            variant="outline"
                            className="mt-6"
                            onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
                        >
                            Clear All Filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
