import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ScheduleProvider, AuthProvider, NewsProvider, AnnouncementsProvider, NotificationsProvider, MeetingRecordsProvider } from "@/contexts";
import { ChatbotButton } from "@/components/chatbot";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const HomePage = lazy(() => import("./pages/HomePage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const NewsDetailPage = lazy(() => import("./pages/NewsDetailPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const AnnouncementDetailPage = lazy(() => import("./pages/AnnouncementDetailPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ScheduleManagement = lazy(() => import("./pages/admin/ScheduleManagement"));
const AdminSchedulePage = lazy(() => import("./pages/admin/AdminSchedulePage"));
const NewsManagement = lazy(() => import("./pages/admin/NewsManagement"));
const AnnouncementsManagement = lazy(() => import("./pages/admin/AnnouncementsManagement"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const MeetingRecordsPage = lazy(() => import("./pages/admin/MeetingRecordsPage"));
const WeeklyNotesPage = lazy(() => import("./pages/admin/WeeklyNotesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <NewsProvider>
          <AnnouncementsProvider>
            <NotificationsProvider>
              <ScheduleProvider>
                <MeetingRecordsProvider>
                  <TooltipProvider>
                    <Toaster />
                    <BrowserRouter>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Routes>
                          {/* Public Routes */}
                          <Route path="/" element={<HomePage />} />
                          <Route path="/lich-cong-tac" element={<SchedulePage />} />
                          <Route path="/gioi-thieu" element={<AboutPage />} />
                          <Route path="/tin-tuc" element={<NewsPage />} />
                          <Route path="/tin-tuc/:id" element={<NewsDetailPage />} />
                          <Route path="/thong-bao" element={<AnnouncementsPage />} />
                          <Route path="/thong-bao/:id" element={<AnnouncementDetailPage />} />

                          <Route path="/dang-nhap" element={<LoginPage />} />

                          {/* Admin Routes */}
                          <Route element={<ProtectedRoute />}>
                            <Route path="/quan-tri" element={<AdminDashboard />} />
                            <Route path="/quan-tri/lich" element={<AdminSchedulePage />} />
                            <Route path="/quan-tri/quan-ly-lich" element={<ScheduleManagement />} />
                            <Route path="/quan-tri/ghi-chu" element={<WeeklyNotesPage />} />
                            <Route path="/quan-tri/noi-dung-cuoc-hop" element={<MeetingRecordsPage />} />
                            <Route path="/quan-tri/tin-tuc" element={<NewsManagement />} />
                            <Route path="/quan-tri/thong-bao" element={<AnnouncementsManagement />} />
                            <Route path="/quan-tri/nguoi-dung" element={<UsersManagement />} />
                            <Route path="/quan-tri/cai-dat" element={<SettingsPage />} />
                          </Route>

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>

                      {/* Chatbot Button - hiển thị trên mọi trang */}
                      <ChatbotButton />
                    </BrowserRouter>
                  </TooltipProvider>
                </MeetingRecordsProvider>
              </ScheduleProvider>
            </NotificationsProvider>
          </AnnouncementsProvider>
        </NewsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
