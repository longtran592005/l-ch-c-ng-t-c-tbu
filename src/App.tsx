import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ScheduleProvider, AuthProvider, NewsProvider, AnnouncementsProvider, NotificationsProvider } from "@/contexts";
import HomePage from "./pages/HomePage";
import SchedulePage from "./pages/SchedulePage";
import LoginPage from "./pages/LoginPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import NewsPage from "./pages/NewsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AnnouncementDetailPage from "./pages/AnnouncementDetailPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ScheduleManagement from "./pages/admin/ScheduleManagement";
import AdminSchedulePage from "./pages/admin/AdminSchedulePage";
import NewsManagement from "./pages/admin/NewsManagement";
import AnnouncementsManagement from "./pages/admin/AnnouncementsManagement";
import UsersManagement from "./pages/admin/UsersManagement";
import SettingsPage from "./pages/admin/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <NewsProvider>
          <AnnouncementsProvider>
            <NotificationsProvider>
              <ScheduleProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/lich-cong-tac" element={<SchedulePage />} />
                      <Route path="/gioi-thieu" element={<AboutPage />} />
                      <Route path="/tin-tuc" element={<NewsPage />} />
                      <Route path="/tin-tuc/:id" element={<NewsDetailPage />} />
                      <Route path="/thong-bao" element={<AnnouncementsPage />} />
                      <Route path="/thong-bao/:id" element={<AnnouncementDetailPage />} />
                      <Route path="/lien-he" element={<ContactPage />} />
                      <Route path="/dang-nhap" element={<LoginPage />} />
                      
                      {/* Admin Routes */}
                      <Route path="/quan-tri" element={<AdminDashboard />} />
                      <Route path="/quan-tri/lich" element={<AdminSchedulePage />} />
                      <Route path="/quan-tri/quan-ly-lich" element={<ScheduleManagement />} />
                      <Route path="/quan-tri/tin-tuc" element={<NewsManagement />} />
                      <Route path="/quan-tri/thong-bao" element={<AnnouncementsManagement />} />
                      <Route path="/quan-tri/nguoi-dung" element={<UsersManagement />} />
                      <Route path="/quan-tri/cai-dat" element={<SettingsPage />} />
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </ScheduleProvider>
            </NotificationsProvider>
          </AnnouncementsProvider>
        </NewsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
