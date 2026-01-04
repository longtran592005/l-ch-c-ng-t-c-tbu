import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Newspaper, Eye, Calendar, Search } from 'lucide-react';
import { useNews } from '@/contexts/NewsContext';
import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export default function NewsPage() {
  const { newsList } = useNews();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredNews = useMemo(() => {
    if (!debouncedSearchTerm) {
      return newsList;
    }
    return newsList.filter(news =>
      news.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      news.summary.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [newsList, debouncedSearchTerm]);

  return (
    <MainLayout>
      <title>Tin tức - Trường Đại học Thái Bình</title>
      <meta name="description" content="Tin tức và sự kiện từ Trường Đại học Thái Bình" />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
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
            <Link to="/" className="hover:text-primary">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">Tin tức</span>
          </nav>
        </div>
      </section>

      {/* News List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Search Bar */}
          <div className="mb-8 max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm tin tức, sự kiện..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((news) => (
              <Link key={news.id} to={`/tin-tuc/${news.id}`} className="block group">
                <article className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300">
                  {news.image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={news.image}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
              </Link>
            ))}
          </div>

          {filteredNews.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Không tìm thấy tin tức nào phù hợp</p>
              <p className="text-sm">Vui lòng thử với từ khóa khác.</p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
