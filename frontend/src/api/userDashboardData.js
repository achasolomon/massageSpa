// src/api/useDashboardData.js
import { useEffect, useState } from 'react';

const useDashboardData = () => {
  const [data, setData] = useState({
    todaySessions: 0,
    sessionChange: 0,
    revenue: 0,
    revenueChange: 0,
    retentionRate: 0,
    retentionChange: 0,
    utilizationRate: 0,
    utilizationChange: 0,
    revenueTrend: [],
    therapistAvailability: [],
    upcomingSessions: [],
    clientDemographics: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulated async fetch
    setTimeout(() => {
      try {
        setData(prev => ({
          ...prev,
          todaySessions: 12,
          sessionChange: 5,
          revenue: 2500,
          revenueChange: 8,
          retentionRate: 78,
          retentionChange: 3,
          utilizationRate: 85,
          utilizationChange: 2,
          revenueTrend: [1000, 1200, 1400, 1600, 1800, 2000],
          therapistAvailability: [80, 90, 70, 85],
          upcomingSessions: [
            { id: 1, name: 'John Doe', time: '10:00 AM' },
            { id: 2, name: 'Jane Smith', time: '11:30 AM' },
          ],
          clientDemographics: [
            { label: 'Male', value: 40 },
            { label: 'Female', value: 55 },
            { label: 'Other', value: 5 },
          ],
        }));
        setIsLoading(false);
      } catch (err) {
        setError(err);
        setIsLoading(false);
      }
    }, 1000);
  }, []);

  return { data, isLoading, error };
};

export default useDashboardData;
