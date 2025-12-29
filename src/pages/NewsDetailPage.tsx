import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MainLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNews } from '@/contexts/NewsContext';
import { Calendar, User, Eye, ArrowLeft, Share2, Printer, Facebook, Twitter } from 'lucide-react';

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getNewsById, incrementViews, newsList } = useNews();
  const news = id ? getNewsById(id) : undefined;

  useEffect(() => {
    if (id) {
      incrementViews(id);
    }
  }, [id]);

  if (!news) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy tin tức</h1>
          <Link to="/tin-tuc">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Get related news (same category, excluding current)
  const relatedNews = newsList
    .filter(n => n.category === news.category && n.id !== news.id)
    .slice(0, 3);

  return (
    <MainLayout>
      <title>{news.title} - Trường Đại học Thái Bình</title>
      <meta name="description" content={news.summary} />

      {/* Breadcrumb */}
      <section className="bg-secondary/50 py-3 border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link to="/tin-tuc" className="hover:text-primary">Tin tức</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium line-clamp-1">{news.title}</span>
          </nav>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-8">
              <Badge variant="secondary" className="mb-4">
                {news.category === 'news' ? 'Tin tức' : news.category === 'event' ? 'Sự kiện' : 'Thông báo'}
              </Badge>
              
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                {news.title}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-6">
                {news.summary}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{news.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(news.publishedAt), "dd 'tháng' MM, yyyy", { locale: vi })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{news.views.toLocaleString()} lượt xem</span>
                </div>
              </div>
            </header>

            {/* Featured Image */}
            {news.image && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-auto aspect-video object-cover"
                />
                <p className="text-sm text-muted-foreground italic text-center py-3 bg-secondary/30">
                  Ảnh minh họa: {news.title}
                </p>
              </div>
            )}

            {/* Content */}
            <div className="prose prose-lg max-w-none mb-8">
              <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                {news.content}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-4 py-6 border-t border-b border-border mb-8">
              <span className="font-medium text-foreground">Chia sẻ:</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Sao chép
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  In
                </Button>
              </div>
            </div>

            {/* Related News */}
            {relatedNews.length > 0 && (
              <section>
                <h3 className="font-serif text-xl font-bold text-foreground mb-6">Tin tức liên quan</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {relatedNews.map((item) => (
                    <Link key={item.id} to={`/tin-tuc/${item.id}`} className="group">
                      <div className="university-card overflow-hidden">
                        {item.image && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(item.publishedAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Back Button */}
            <div className="mt-8">
              <Link to="/tin-tuc">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại danh sách tin tức
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </MainLayout>
  );
}
