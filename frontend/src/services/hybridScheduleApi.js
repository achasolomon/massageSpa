// services/hybridScheduleApi.js
import apiClient from './apiClient';

class HybridScheduleApi {
  
  // --- HYBRID SCHEDULE ENDPOINTS ---
  
  /**
   * Get therapist's daily schedule (bookings + availability)
   */
  async getTherapistDailySchedule(therapistId, date) {
    const response = await apiClient.get(`/schedule/therapist/${therapistId}/daily`, {
      params: { date }
    });
    return response.data;
  }
  
  /**
   * Get therapist's weekly schedule overview
   */
  async getTherapistWeeklySchedule(therapistId, startDate) {
    const response = await apiClient.get(`/schedule/therapist/${therapistId}/weekly`, {
      params: { startDate }
    });
    return response.data;
  }
  
  /**
   * Get all therapists schedule overview for admin
   */
  async getAllTherapistsOverview(date) {
    const response = await apiClient.get('/schedule/overview', {
      params: { date }
    });
    return response.data;
  }
  
  /**
   * Get available booking slots for a therapist
   */
  async getAvailableBookingSlots(therapistId, date, duration = 60) {
    const response = await apiClient.get(`/schedule/availability/${therapistId}`, {
      params: { date, duration }
    });
    return response.data;
  }
  
  // --- THERAPIST SELF-SERVICE ENDPOINTS ---
  
  /**
   * Get my daily schedule (for therapist users)
   */
  async getMyDailySchedule(date) {
    const response = await apiClient.get('/schedule/my/daily', {
      params: { date }
    });
    return response.data;
  }
  
  /**
   * Get my weekly schedule (for therapist users)
   */
  async getMyWeeklySchedule(startDate) {
    const response = await apiClient.get('/schedule/my/weekly', {
      params: { startDate }
    });
    return response.data;
  }
  
  /**
   * Get my availability settings (for therapist users)
   */
  async getMyAvailabilitySettings() {
    const response = await apiClient.get('/schedule/my/availability-settings');
    return response.data;
  }
  
  /**
   * Create my availability setting (for therapist users)
   */
  async createMyAvailabilitySetting(setting) {
    const response = await apiClient.post('/schedule/my/availability-settings', setting);
    return response.data;
  }
  
  /**
   * Update my availability setting (for therapist users)
   */
  async updateMyAvailabilitySetting(id, updates) {
    const response = await apiClient.put(`/schedule/my/availability-settings/${id}`, updates);
    return response.data;
  }
  
  /**
   * Delete my availability setting (for therapist users)
   */
  async deleteMyAvailabilitySetting(id) {
    const response = await apiClient.delete(`/schedule/my/availability-settings/${id}`);
    return response.data;
  }
  
  /**
   * Get my schedule statistics (for therapist users)
   */
  async getMyScheduleStats(startDate, endDate) {
    const response = await apiClient.get('/schedule/my/stats', {
      params: { startDate, endDate }
    });
    return response.data;
  }
  
  /**
   * Update my booking status (for therapist users)
   */
  async updateMyBookingStatus(bookingId, status, notes = '') {
    const response = await apiClient.put(`/schedule/my/bookings/${bookingId}/status`, {
      status,
      notes
    });
    return response.data;
  }
  
  /**
   * Add notes to my booking (for therapist users)
   */
  async addBookingNotes(bookingId, notes) {
    const response = await apiClient.put(`/schedule/my/bookings/${bookingId}/notes`, {
      notes
    });
    return response.data;
  }
  
  /**
   * Request time off (for therapist users)
   */
  async requestTimeOff(request) {
    const response = await apiClient.post('/schedule/my/time-off-request', request);
    return response.data;
  }
  
  /**
   * Get my time off requests (for therapist users)
   */
  async getMyTimeOffRequests() {
    const response = await apiClient.get('/schedule/my/time-off-requests');
    return response.data;
  }
  
  /**
   * Cancel my time off request (for therapist users)
   */
  async cancelMyTimeOffRequest(requestId) {
    const response = await apiClient.delete(`/schedule/my/time-off-requests/${requestId}`);
    return response.data;
  }
  
  // --- AVAILABILITY MANAGEMENT ENDPOINTS ---
  
  /**
   * Get therapist's availability settings
   */
  async getTherapistAvailabilitySettings(therapistId) {
    const response = await apiClient.get(`/schedule/availability-settings/${therapistId}`);
    return response.data;
  }
  
  /**
   * Create availability setting for therapist (admin)
   */
  async createAvailabilitySetting(setting) {
    const response = await apiClient.post('/schedule/availability-settings', setting);
    return response.data;
  }
  
  /**
   * Create multiple availability settings for therapist (admin)
   */
  async createBulkAvailabilitySettings(settings) {
    const response = await apiClient.post('/schedule/availability-settings/bulk', { settings });
    return response.data;
  }
  
  /**
   * Update availability setting
   */
  async updateAvailabilitySetting(id, updates) {
    const response = await apiClient.put(`/schedule/availability-settings/${id}`, updates);
    return response.data;
  }
  
  /**
   * Delete availability setting
   */
  async deleteAvailabilitySetting(id) {
    const response = await apiClient.delete(`/schedule/availability-settings/${id}`);
    return response.data;
  }
  
  // --- BOOKING MANAGEMENT ENDPOINTS ---
  
  /**
   * Update booking status (admin)
   */
  async updateBookingStatus(bookingId, status, notes = '') {
    const response = await apiClient.put(`/schedule/bookings/${bookingId}/status`, {
      status,
      notes
    });
    return response.data;
  }
  
  /**
   * Reschedule booking (admin)
   */
  async rescheduleBooking(bookingId, newDateTime, duration) {
    const response = await apiClient.put(`/schedule/bookings/${bookingId}/reschedule`, {
      newDateTime,
      duration
    });
    return response.data;
  }
  
  /**
   * Get booking details
   */
  async getBookingDetails(bookingId) {
    const response = await apiClient.get(`/schedule/bookings/${bookingId}`);
    return response.data;
  }
  
  // --- TIME OFF MANAGEMENT ENDPOINTS ---
  
  /**
   * Get all time off requests (admin)
   */
  async getAllTimeOffRequests(status = null) {
    const params = status ? { status } : {};
    const response = await apiClient.get('/schedule/time-off-requests', { params });
    return response.data;
  }
  
  /**
   * Approve/Deny time off request (admin)
   */
  async updateTimeOffRequestStatus(requestId, status, adminNotes = '') {
    const response = await apiClient.put(`/schedule/time-off-requests/${requestId}/status`, {
      status,
      adminNotes
    });
    return response.data;
  }
  
  /**
   * Get therapist's time off requests (admin)
   */
  async getTherapistTimeOffRequests(therapistId) {
    const response = await apiClient.get(`/schedule/therapist/${therapistId}/time-off-requests`);
    return response.data;
  }
  
  // --- UTILITY ENDPOINTS ---
  
  /**
   * Get therapist schedule statistics
   */
  async getTherapistScheduleStats(therapistId, startDate, endDate) {
    const response = await apiClient.get(`/schedule/stats/${therapistId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  }
  
  /**
   * Bulk update availability settings
   */
  async bulkUpdateAvailability(therapistId, settings) {
    const response = await apiClient.post('/schedule/bulk-availability', {
      therapistId,
      settings
    });
    return response.data;
  }
  
  /**
   * Get schedule conflicts
   */
  async getScheduleConflicts(therapistId, startDate, endDate) {
    const response = await apiClient.get(`/schedule/conflicts/${therapistId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  }
  
  /**
   * Generate schedule report
   */
  async generateScheduleReport(params) {
    const response = await apiClient.post('/schedule/reports/generate', params);
    return response.data;
  }
}

export default new HybridScheduleApi();