// src/service/feedbackApi.js
import clientApi from './clientApi';

export const fetchFeedback = async () => {
  const response = await clientApi.get('/feedback');
  return response.data;
};

export const submitFeedback = async (feedbackData) => {
  const response = await clientApi.post('/feedback', feedbackData);
  return response.data;
};
