import { format } from 'date-fns';
import { MainLayout } from '@/components/layout';
import { mockNews } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Eye, Calendar } from 'lucide-react';

export default function NewsPage() {
  return (
    <MainLayout>
      <title>Tin tức - Trường Đại học Thái Bình</title>
      <meta name="description" content="Tin tức và sự kiện từ Trường Đại học Thái Bình" />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                Tin tức - Sự kiện
              </h1>
              <p className="text-primary-foreground/80">
                Cập nhật tin tức và hoạt động mới nhất của Trường Đại học Thái Bình
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="bg-secondary/50 py-3 border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-muted-foreground">
            <a href="/" className="hover:text-primary">Trang chủ</a>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">Tin tức</span>
          </nav>
        </div>
      </section>

      {/* News List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockNews.map((news) => (
              <article key={news.id} className="university-card group cursor-pointer">
                {news.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {news.category === 'news' ? 'Tin tức' : news.category === 'event' ? 'Sự kiện' : 'Thông báo'}
                    </Badge>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {news.title}
                  </h2>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                    {news.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(news.publishedAt), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{news.views.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
