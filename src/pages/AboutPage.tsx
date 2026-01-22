import { MainLayout } from '@/components/layout';
import { Building2, Users, Award, GraduationCap, Target, Eye } from 'lucide-react';

export default function AboutPage() {
  return (
    <MainLayout>
      <title>Giới thiệu - Trường Đại học Thái Bình</title>
      <meta name="description" content="Giới thiệu về Trường Đại học Thái Bình - 65 năm xây dựng và phát triển" />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                Giới thiệu
              </h1>
              <p className="text-primary-foreground/80">
                Trường Đại học Thái Bình - 65 năm xây dựng và phát triển
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
            <span className="text-foreground font-medium">Giới thiệu</span>
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* History */}
            <div className="university-card p-8 mb-8">
              <h2 className="section-header font-serif text-2xl font-bold text-primary mb-6">
                Lịch sử hình thành và phát triển
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Trường Đại học Thái Bình được thành lập năm 1960, tiền thân là Trường Trung cấp Sư phạm Thái Bình. 
                  Trải qua 65 năm xây dựng và phát triển, Trường đã trở thành một cơ sở đào tạo đa ngành, đa lĩnh vực 
                  với quy mô lớn nhất tỉnh Thái Bình.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Hiện nay, Trường Đại học Thái Bình là cơ sở giáo dục đại học công lập trực thuộc UBND tỉnh Thái Bình, 
                  thực hiện nhiệm vụ đào tạo nguồn nhân lực chất lượng cao cho sự phát triển kinh tế - xã hội của 
                  tỉnh Thái Bình và cả nước.
                </p>
              </div>
            </div>

            {/* Vision & Mission */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="university-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-primary">Tầm nhìn</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Trở thành trường đại học đa ngành, định hướng ứng dụng có uy tín trong khu vực và cả nước, 
                  đào tạo nguồn nhân lực chất lượng cao đáp ứng yêu cầu phát triển kinh tế - xã hội.
                </p>
              </div>

              <div className="university-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-primary">Sứ mạng</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Đào tạo nguồn nhân lực chất lượng cao; nghiên cứu khoa học và chuyển giao công nghệ; 
                  phục vụ cộng đồng, góp phần vào sự phát triển kinh tế - xã hội của địa phương và đất nước.
                </p>
              </div>
            </div>


            {/* Leadership */}
            <div className="university-card p-8">
              <h2 className="section-header font-serif text-2xl font-bold text-primary mb-6">
                Ban Giám hiệu
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { name: 'PGS.TS Phạm Quốc Thành', position: 'Hiệu trưởng' },
                  { name: 'TS. Trần Thị Hòa', position: 'Phó Hiệu trưởng' },
                  { name: 'TS. Hà Văn Đổng', position: 'Phó Hiệu trưởng' },
                ].map((leader, index) => (
                  <div key={index} className="text-center p-4 bg-secondary/30 rounded-lg">
                    <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                      <Users className="h-10 w-10 text-primary/50" />
                    </div>
                    <h4 className="font-semibold text-foreground">{leader.name}</h4>
                    <p className="text-sm text-muted-foreground">{leader.position}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
