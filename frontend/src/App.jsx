import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import LoginPage from './pages/admin/LoginPage';
import ProtectedRoute from './components/admin/ProtectedRoute';
import ManagementLayout from './components/admin/ManagementLayout';
import DashboardPage from './pages/admin/DashboardPage';
import UserListPage from './pages/admin/users/UserListPage';
import TherapistListPage from './pages/admin/therapists/TherapistListPage';
import ServiceListPage from './pages/admin/services/ServiceListPage';
import BookingListPage from './pages/admin/bookings/BookingListPage';
import BookingEditPage from './pages/admin/bookings/BookingEditPage';
import RevenueReportPage from './pages/admin/reports/RevenueReportPage';
import BookingStatsPage from './pages/admin/reports/BookingStatsPage';
import RemindersPage from './pages/admin/reminders/RemindersPage';
import ClientManagementPage from './pages/admin/clients/ClientsListPage';
import ScheduleManagement from './pages/admin/schedule/SchedulePage';
import MySchedule from './pages/admin/schedule/MySchedulePage';
import ClinicalNotesPage from './pages/admin/clinicalNotes/ClinicalNotesPage';
import ProfilePage from './pages/admin/users/ProfilePage';
import ConsentForm from './pages/client/ConsentForm';
import PrivacyPolicy from './pages/client/PrivatePolicy';
import ClinicalNoteDetailPage from './components/clinicalNotesDetails/ClinicalNoteDetails';
import SettingsConfigurationPage from './pages/admin/settings/Settings';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import SignupPage from './pages/admin/Signup';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CssBaseline } from '@mui/material';
import theme from './components/theme/theme';

// Initialize Stripe with error handling
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
let stripePromise = null;

if (stripeKey) {
  stripePromise = loadStripe(stripeKey).catch(error => {
    console.error('Failed to load Stripe:', error);
    return null;
  });
} else {
  console.warn('Stripe publishable key not found in environment variables');
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          stripePromise ? (
            <Elements stripe={stripePromise}>
              <BookingPage />
            </Elements>
          ) : (
            <BookingPage />
          )
        } />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="admin/signup" element={<SignupPage />} />
        <Route path="/admin/reports" element={<Navigate to="/admin/reports/revenue" replace />} />
        {/* Client Consent Form */}
        <Route path="consent-form/:token" element={<ConsentForm />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        {/* Protected Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <ManagementLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Users */}
          <Route path="users" element={<UserListPage />} />
          <Route path="users/profile" element={<ProfilePage />} />
          {/* Therapists */}
          <Route path="therapists" element={<TherapistListPage />} />

          {/* Services */}
          <Route path="services" element={<ServiceListPage />} />

          {/* Bookings */}
          <Route path="bookings" element={<BookingListPage />} />
          <Route path="bookings/:id" element={<BookingEditPage />} />

          {/* Reports */}
          <Route path="reports" element={<Navigate to="revenue" replace />} />
          <Route path="reports/revenue" element={<RevenueReportPage />} />
          <Route path="reports/stats" element={<BookingStatsPage />} />

          {/* Reminders */}
          <Route path="reminders" element={<RemindersPage />} />
          {/* Client route */}
          <Route path="clients" element={<ClientManagementPage />} />

          {/* schedule routes */}
          <Route path="schedule" element={<ScheduleManagement />} />
          <Route path="myschedule" element={<MySchedule />} />
          {/* Clinical Notes */}
          <Route path="clinical-notes" element={<ClinicalNotesPage />} />
          <Route path="clinical-notes/:id" element={<ClinicalNoteDetailPage />} />
          <Route path="admin/clinical-notes/new" element={<ClinicalNoteDetailPage />} />
          {/* Settings */}
          <Route path="settings" element={<SettingsConfigurationPage />} />

        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;