import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowRight, Calendar, Newspaper, Bell, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockSchedules, mockNews, mockAnnouncements } from '@/data/mockData';
import heroCampus from '@/assets/hero-campus.jpg';

export default function HomePage() {
  // Lấy 5 lịch công tác gần nhất đã được duyệt
  const upcomingSchedules = mockSchedules
    .filter(s => s.status === 'approved')
    .slice(0, 5);

  // Lấy 4 tin tức mới nhất
  const latestNews = mockNews.slice(0, 4);

  // Lấy 4 thông báo mới nhất
  const latestAnnouncements = mockAnnouncements.slice(0, 4);

  return (
    <MainLayout>
      {/* SEO Meta */}
      <title>Trường Đại học Thái Bình - Hệ thống Quản lý Lịch Công Tác</title>
      <meta name="description" content="Website chính thức của Trường Đại học Thái Bình - Hệ thống quản lý và công bố lịch công tác tuần của Ban Giám hiệu" />

      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <img
          src={heroCampus}
          alt="Khuôn viên Trường Đại học Thái Bình"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/85 to-primary/95" />
        
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <Badge className="mb-4 bg-accent text-accent-foreground border-0 px-4 py-1.5 text-sm animate-fade-in">
            Chào mừng kỷ niệm 65 năm thành lập (1960 - 2025)
          </Badge>
          
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            TRƯỜNG ĐẠI HỌC THÁI BÌNH
          </h1>
          
          <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Hệ thống Quản lý và Công bố Lịch Công Tác Tuần<br />
            Ban Giám hiệu Trường Đại học Thái Bình
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/lich-cong-tac">
              <Button size="lg" className="btn-accent gap-2">
                <Calendar className="h-5 w-5" />
                Xem lịch công tác
              </Button>
            </Link>
            <Link to="/gioi-thieu">
              <Button size="lg" variant="outline" className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50">
                Giới thiệu
              </Button>
            </Link>
          </div>
        </div>

        {/* Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 -mt-16 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Năm thành lập', value: '1960', icon: '🎓' },
              { label: 'Ngành đào tạo', value: '25+', icon: '📚' },
              { label: 'Sinh viên', value: '8,000+', icon: '👨‍🎓' },
              { label: 'Giảng viên', value: '350+', icon: '👨‍🏫' },
            ].map((stat) => (
              <div key={stat.label} className="university-card p-4 text-center">
                <span className="text-3xl mb-2 block">{stat.icon}</span>
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Schedule Preview - Main Feature */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="section-header font-serif text-2xl font-bold text-primary">
                  Lịch công tác tuần
                </h2>
                <Link to="/lich-cong-tac" className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 text-sm">
                  Xem đầy đủ <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="university-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="px-4 py-3 text-left font-semibold">Thứ/Ngày</th>
                        <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                        <th className="px-4 py-3 text-left font-semibold">Nội dung</th>
                        <th className="px-4 py-3 text-left font-semibold">Địa điểm</th>
                        <th className="px-4 py-3 text-left font-semibold">Chủ trì</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingSchedules.map((schedule, index) => (
                        <tr key={schedule.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{schedule.dayOfWeek}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(schedule.date), 'dd/MM')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {schedule.startTime}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground line-clamp-2">{schedule.content}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="line-clamp-1">{schedule.location}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium">{schedule.leader}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                <Link to="/thong-bao" className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 text-sm">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {latestAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="university-card p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        announcement.priority === 'important' 
                          ? 'bg-university-red/10 text-university-red'
                          : announcement.priority === 'urgent'
                          ? 'bg-accent/20 text-accent-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground line-clamp-2 mb-1 hover:text-primary transition-colors cursor-pointer">
                          {announcement.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(announcement.publishedAt), 'dd/MM/yyyy', { locale: vi })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="section-header font-serif text-2xl font-bold text-primary">
              Tin tức - Sự kiện
            </h2>
            <Link to="/tin-tuc" className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1">
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestNews.map((news, index) => (
              <article key={news.id} className="university-card group">
                {news.image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {news.category === 'news' ? 'Tin tức' : news.category === 'event' ? 'Sự kiện' : 'Thông báo'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(news.publishedAt), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors cursor-pointer">
                    {news.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {news.summary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">
            Quản lý lịch công tác hiệu quả
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Đăng nhập để quản lý, cập nhật và theo dõi lịch công tác của Ban Giám hiệu một cách dễ dàng và hiệu quả.
          </p>
          <Link to="/dang-nhap">
            <Button size="lg" className="btn-accent gap-2">
              Đăng nhập hệ thống
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
