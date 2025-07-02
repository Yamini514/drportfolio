import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { BrowserRouter, Route, Router , Routes, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import UserLogin from './pages/auth/UserLogin';
import UserRegister from './pages/auth/UserRegister';
import Testimonials from './pages/Testimonials';
import BookAppointment from './pages/BookAppointment';
// import AdminDashboard from './pages/admin/AdminDashboard';
import Gallery from './pages/Gallery';
import Review from './pages/Review';
import ContactMe from './pages/ContactMe';
import Publications from './pages/Publications';
import Articles from './pages/Articles';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import ServicesContent from './pages/admin/ServicesContent';
import AppointmentsContent from './pages/admin/Appointment/AppointmentsContent';
import VideoContent from './pages/admin/VideoContent';
// import AboutContent from './pages/admin/AboutContent';
import PublicationsContent from './pages/admin/PublicationsContent';
// import StatsContent from './pages/admin/StatsContent';
import ReviewsContent from './pages/admin/ReviewsContent';
import Messages from './pages/admin/Messages';
import SocialIconsResponsive from './pages/SocialIcons';
import AppointmentSchedular from './pages/admin/Appointment';
import AdminForgotPassword from './pages/admin/AdminForgotPassword';
import Appointments from './pages/admin/Appointment';
// import ArticlesContent from './pages/admin/ArticlesContent';
// Add this import at the top with other imports
import ForgotPassword from './pages/ForgotPassword';
import MyAppointments from './pages/MyAppointments';
import Forgotpassword from './pages/auth/UserForgotPassword';

// Create a wrapper component to conditionally render social icons
function SocialIconsWrapper() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  return !isAdminRoute ? <SocialIconsResponsive /> : null;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* <SocialIconsWrapper /> */}
        <Routes>
          {/* Public routes with Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="services" element={<Services />} />
            {/* <Route path="testimonials" element={<Testimonials />} /> */}
            <Route path="contact" element={<ContactMe />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path='/review' element={<Review />}/>
            <Route path='bookappointment' element={<BookAppointment />}/>
            <Route path='publications' element={<Publications />}/>
            <Route path='articles' element={<Articles />}/>
            <Route path="login" element={<UserLogin />} />
            <Route path="userregister" element={<UserRegister />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="/userforgotpassword" element={<Forgotpassword />} />
            {/* Add this route */}
           
          </Route>
          <Route path="forgot-password" element={<AdminForgotPassword />} />
          {/* Admin routes */}
          <Route path="/admin">
            <Route index element={<AdminLogin />} />
            <Route element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              

              <Route path="dashboard" element={<Navigate to="/admin/services" replace />} />
              <Route path="services" element={<ServicesContent/>} />
              <Route path="appointments/*" element={<Appointments/>} />
              <Route path="video" element={<VideoContent/>} />
              {/* <Route path="about" element={<AboutContent/>} /> */}
              <Route path="publications" element={<PublicationsContent/>} />
              <Route path="messages" element={<Messages/>}/>
              {/* <Route path="articles" element={<ArticlesContent/>} /> */}
              {/* <Route path="stats" element={<StatsContent/>} /> */}
              <Route path="reviews" element={<ReviewsContent/>}/>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

// In your Routes component

