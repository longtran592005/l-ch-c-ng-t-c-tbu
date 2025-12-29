import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowRight, Calendar, Newspaper, Bell, Clock, MapPin, User, ChevronRight, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSchedules } from '@/contexts';
import { useNews } from '@/contexts/NewsContext';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import heroCampus from '@/assets/hero-campus.jpg';

export default function HomePage() {
  const { getApprovedSchedules } = useSchedules();
  const { newsList } = useNews();
  const { announcementsList } = useAnnouncements();
  
  const upcomingSchedules = getApprovedSchedules().slice(0, 5);
  const latestNews = newsList.slice(0, 4);
  const latestAnnouncements = announcementsList.slice(0, 4);

  return (
    <MainLayout>
      <title>Trường Đại học Thái Bình - Hệ thống Quản lý Lịch Công Tác</title>
      <meta name="description" content="Website chính thức của Trường Đại học Thái Bình - Hệ thống quản lý và công bố lịch công tác tuần của Ban Giám hiệu" />

      {/* Hero Section - Modern Glass Design */}
      <section className="relative min-h-[600px] md:min-h-[700px] overflow-hidden">
        <img
          src={heroCampus}
          alt="Khuôn viên Trường Đại học Thái Bình"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center py-20">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 animate-fade-in">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-primary-foreground/90 text-sm font-medium">
              Chào mừng kỷ niệm 65 năm thành lập (1960 - 2025)
            </span>
          </div>
          
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            TRƯỜNG ĐẠI HỌC<br />
            <span className="text-accent">THÁI BÌNH</span>
          </h1>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Hệ thống Quản lý và Công bố Lịch Công Tác Tuần<br />
            Ban Giám hiệu Trường Đại học Thái Bình
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/lich-cong-tac">
              <Button size="lg" className="btn-accent gap-2 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Calendar className="h-5 w-5" />
                Xem lịch công tác
              </Button>
            </Link>
            <Link to="/gioi-thieu">
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-primary-foreground hover:bg-white/10 backdrop-blur-sm px-8 py-6 rounded-xl">
                Giới thiệu
              </Button>
            </Link>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Schedule Preview */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="section-header font-serif text-2xl font-bold text-primary">
                  Lịch công tác tuần
                </h2>
                <Link to="/lich-cong-tac" className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 text-sm group">
                  Xem đầy đủ 
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
                        <th className="px-4 py-4 text-left font-semibold">Thứ/Ngày</th>
                        <th className="px-4 py-4 text-left font-semibold">Thời gian</th>
                        <th className="px-4 py-4 text-left font-semibold">Nội dung</th>
                        <th className="px-4 py-4 text-left font-semibold">Địa điểm</th>
                        <th className="px-4 py-4 text-left font-semibold">Chủ trì</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingSchedules.length > 0 ? (
                        upcomingSchedules.map((schedule, index) => (
                          <tr key={schedule.id} className={`border-b border-border hover:bg-primary/5 transition-colors ${index % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-foreground">{schedule.dayOfWeek}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(schedule.date), 'dd/MM')}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Clock className="h-4 w-4 text-primary" />
                                {schedule.startTime}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-foreground line-clamp-2">{schedule.content}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 text-accent" />
                                <span className="line-clamp-1">{schedule.location}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 text-sm">
                                <User className="h-4 w-4 text-primary" />
                                <span className="font-medium">{schedule.leader}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg">Chưa có lịch công tác được duyệt</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Announcements Sidebar */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="section-header font-serif text-2xl font-bold text-primary">
                  Thông báo
                </h2>
                <Link to="/thong-bao" className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 text-sm group">
                  Xem tất cả 
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="space-y-4">
                {latestAnnouncements.map((announcement) => (
                  <Link 
                    key={announcement.id} 
                    to={`/thong-bao/${announcement.id}`}
                    className="block"
                  >
                    <div className="bg-card rounded-xl p-4 border border-border hover:border-primary/30 hover:shadow-lg transition-all group">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          announcement.priority === 'important' 
                            ? 'bg-amber-100 text-amber-600'
                            : announcement.priority === 'urgent'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {announcement.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(announcement.publishedAt), 'dd/MM/yyyy', { locale: vi })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-gradient-to-b from-secondary/30 to-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="section-header font-serif text-3xl font-bold text-primary mb-2">
                Tin tức - Sự kiện
              </h2>
              <p className="text-muted-foreground">Cập nhật tin tức mới nhất từ Trường Đại học Thái Bình</p>
            </div>
            <Link to="/tin-tuc" className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-2 group">
              Xem tất cả 
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestNews.map((news, index) => (
              <Link key={news.id} to={`/tin-tuc/${news.id}`} className="block group">
                <article className={`bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                  {news.image && (
                    <div className={`overflow-hidden ${index === 0 ? 'aspect-[16/10]' : 'aspect-video'}`}>
                      <img
                        src={news.image}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className={`p-5 ${index === 0 ? 'p-6' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {news.category === 'news' ? 'Tin tức' : news.category === 'event' ? 'Sự kiện' : 'Thông báo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(news.publishedAt), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <h3 className={`font-semibold text-foreground mb-2 group-hover:text-primary transition-colors ${index === 0 ? 'text-xl line-clamp-3' : 'line-clamp-2'}`}>
                      {news.title}
                    </h3>
                    <p className={`text-muted-foreground ${index === 0 ? 'line-clamp-3' : 'text-sm line-clamp-2'}`}>
                      {news.summary}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-serif text-4xl font-bold mb-4">
            Quản lý lịch công tác <span className="text-accent">hiệu quả</span>
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-10 text-lg">
            Đăng nhập để quản lý, cập nhật và theo dõi lịch công tác của Ban Giám hiệu một cách dễ dàng và hiệu quả.
          </p>
          <Link to="/dang-nhap">
            <Button size="lg" className="btn-accent gap-2 text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              Đăng nhập hệ thống
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
