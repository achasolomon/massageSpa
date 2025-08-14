import React, { useEffect, useState } from "react";
import {
  Box, Grid, Typography, Card, CardContent, Avatar, LinearProgress, Chip,
  IconButton, alpha, useTheme, Paper, Stack, Button
} from "@mui/material";
import {
  CalendarToday, MonetizationOn, Group, Spa, TrendingUp,
  SentimentVerySatisfied, Notifications, Phone, Email
} from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { styled } from '@mui/material/styles';
import apiclient from "../../services/apiClient";
import useAuth from "../../hooks/useAuth";

// Limit constants
const UPCOMING_LIMIT = 4;
const THERAPIST_LIMIT = 6;

// Styled Analytics Card Container
const AnalyticsCardContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
}));

const StatCard = ({ title, value, change, icon, color }) => {
  const isPositive = Number(change) >= 0;
  return (
    <Card sx={{
      height: '100%',
      backgroundColor: 'background.paper',
      borderRadius: 3,
      boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            bgcolor: alpha(color, 0.1),
            color: color,
            width: 48,
            height: 48,
            borderRadius: 2
          }}>
            {icon}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Box>
        </Box>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 1.5,
          color: isPositive ? 'success.main' : 'error.main'
        }}>
          <TrendingUp fontSize="small" sx={{
            transform: isPositive ? 'none' : 'rotate(180deg)',
            mr: 0.5
          }} />
          <Typography variant="body2" fontWeight={500}>
            {(isPositive ? '+' : '') + change + '%'} vs last period
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const UpcomingSessionCard = ({ session }) => {
  const theme = useTheme();
  return (
    <Paper elevation={0} sx={{
      p: 2,
      mb: 2,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'primary.main',
        boxShadow: '0px 4px 8px rgba(0,0,0,0.08)'
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{
          bgcolor: 'primary.main',
          width: 40,
          height: 40,
          color: 'common.white'
        }}>
          {session.avatar}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {session.client}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            with {session.therapist}
          </Typography>
          <Chip
            label={session.service}
            size="small"
            sx={{
              mt: 0.5,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main'
            }}
          />
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight={600}>
            {session.time}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, justifyContent: 'flex-end' }}>
            <IconButton size="small" sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}>
              <Phone fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}>
              <Email fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
};

const TherapistCard = ({ therapist }) => {
  const theme = useTheme();
  return (
    <Paper elevation={0} sx={{
      p: 2,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'primary.main',
        boxShadow: '0px 4px 8px rgba(0,0,0,0.08)'
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {therapist.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SentimentVerySatisfied fontSize="small" color="warning" />
          {/* <Typography variant="body2" fontWeight={600}>
            {therapist.rating}
          </Typography> */}
        </Box>
      </Box>
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Availability
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {therapist.utilization}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={therapist.utilization}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'grey.100',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              backgroundColor: therapist.utilization > 80 ? 'success.main' :
                therapist.utilization > 60 ? 'warning.main' : 'error.main'
            }
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {therapist.sessions} sessions today
      </Typography>
    </Paper>
  );
};

const MyScheduleCard = ({ schedule }) => (
  <Paper elevation={0} sx={{
    p: 2,
    mb: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
  }}>
    <Typography variant="subtitle2" fontWeight={600}>
      {schedule.date} — {schedule.start} to {schedule.end}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {schedule.type}
    </Typography>
  </Paper>
);

export default function DashboardPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [mySchedule, setMySchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      setLoading(true);
      try {
        const { data } = await apiclient.get("/dashboard/overview");
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) setDashboard(null);
      }
      if (!cancelled) setLoading(false);
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
  async function fetchSchedule() {
    if (user?.role === "therapist") {
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      try {
        const { data } = await apiclient.get("/schedule/me", {
          params: { startDate, endDate }
        });
        setMySchedule(data);
      } catch (e) {
        setMySchedule([]);
      }
    }
  }
  fetchSchedule();
}, [user]);


  if (loading) return <LinearProgress />;
  if (!dashboard) return <Typography color="error" sx={{ mt: 4 }}>Failed to load dashboard data.</Typography>;
  if (!user) return <Typography color="error" sx={{ mt: 4 }}>You must be logged in.</Typography>;

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "staff";
  const isTherapist = user.role === "therapist";
  const isClient = user.role === "client";

  // Filter sessions for therapist/client
  let visibleSessions = dashboard.upcomingSessions;
  if (isTherapist) {
    visibleSessions = dashboard.upcomingSessions?.filter(
      s => s.therapist === `${user.firstName} ${user.lastName}`
    );
  }
  if (isClient) {
    visibleSessions = dashboard.upcomingSessions?.filter(
      s => s.client === `${user.firstName} ${user.lastName}`
    );
  }

  return (
    <Box sx={{
      p: { xs: 2, md: 3 },
      minHeight: "100vh",
      backgroundColor: "background.default",
      maxWidth: "100%",
      overflowX: "scroll",
    }}>
      {/* Header */}
      <Box sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 4,
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: "text.primary", mb: 0.5 }}>
            {isAdmin && "Admin Dashboard"}
            {isStaff && "Staff Dashboard"}
            {isTherapist && "Therapist Dashboard"}
            {isClient && "Client Dashboard"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric"
            })}
          </Typography>
        </Box>
        {/* <IconButton sx={{
          bgcolor: "background.paper", boxShadow: "0px 2px 4px rgba(0,0,0,0.05)",
          border: "1px solid", borderColor: "divider",
          "&:hover": { bgcolor: "background.default", boxShadow: "0px 4px 8px rgba(0,0,0,0.1)" }
        }}>
          <Notifications />
        </IconButton> */}
      </Box>

      {/* Summary Cards - Fixed Layout */}
      <AnalyticsCardContainer>
        {(isAdmin || isStaff) && (
          <StatCard
            title="Today's Sessions"
            value={dashboard.todaySessions}
            change={dashboard.sessionChange}
            icon={<CalendarToday />}
            color={theme.palette.primary.main}
          />
        )}
        {(isAdmin || isStaff) && (
          <StatCard
            title="Revenue"
            value={`$${Number(dashboard.revenue).toLocaleString()}`}
            change={dashboard.revenueChange}
            icon={<MonetizationOn />}
            color={theme.palette.success.main}
          />
        )}
        {isAdmin && (
          <StatCard
            title="Client Retention"
            value={`${dashboard.retentionRate}%`}
            change={dashboard.retentionChange}
            icon={<Group />}
            color={theme.palette.info.main}
          />
        )}
        {isAdmin && (
          <StatCard
            title="Therapist Utilization"
            value={`${dashboard.utilizationRate}%`}
            change={dashboard.utilizationChange}
            icon={<Spa />}
            color={theme.palette.warning.main}
          />
        )}
        {/* Therapist: Only show their own session summary */}
        {isTherapist && (
          <StatCard
            title="My Sessions"
            value={visibleSessions?.length || 0}
            change={dashboard.sessionChange}
            icon={<CalendarToday />}
            color={theme.palette.primary.main}
          />
        )}
      </AnalyticsCardContainer>

      {/* Revenue Chart (admin/staff only) */}
      {(isAdmin || isStaff) && (
        <Card sx={{ mb: 4, p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Revenue Analytics</Typography>
          <Box sx={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={dashboard.revenueChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      )}

      {/* Upcoming Sessions */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={3}>
          Upcoming Sessions
        </Typography>
        <Grid container spacing={2}>
          {visibleSessions?.slice(0, UPCOMING_LIMIT).map(session => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={session.id}>
              <UpcomingSessionCard session={session} />
            </Grid>
          ))}
          {(!visibleSessions || visibleSessions.length === 0) && (
            <Typography color="text.secondary" sx={{ ml: 2 }}>No upcoming sessions.</Typography>
          )}
        </Grid>
      </Card>

      {/* Therapist Availability (admin only, grid, limited) */}
      {isAdmin && (
        <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Therapist Availability
          </Typography>
          <Grid container spacing={2}>
            {(dashboard.therapistAvailability || [])
              .slice(0, THERAPIST_LIMIT)
              .map((therapist, idx) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={therapist.name + idx}>
                  <TherapistCard therapist={therapist} />
                </Grid>
              ))}
            {(dashboard.therapistAvailability || []).length === 0 && (
              <Typography color="text.secondary" sx={{ ml: 2 }}>
                No therapist data.
              </Typography>
            )}
          </Grid>
        </Card>
      )}

      {/* Therapist: My Schedule */}
      {isTherapist && (
        <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>My Schedule (Next 7 Days)</Typography>
          {mySchedule.length ? mySchedule.map((entry, idx) => (
            <MyScheduleCard key={idx} schedule={entry} />
          )) : <Typography color="text.secondary">No schedule data.</Typography>}
        </Card>
      )}
    </Box>
  );
}