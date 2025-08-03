import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Badge,
  Button,
  styled
} from '@mui/material';
import {
  Close as CloseIcon,
  NotificationsNone as NotificationIcon,
  CheckCircle as ReadIcon,
  Circle as UnreadIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const drawerWidth = 380;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    [theme.breakpoints.down('sm')]: {
      width: '100%'
    }
  }
}));

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  position: 'sticky',
  top: 0,
  zIndex: 1
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  height: '60vh'
}));

const notifications = [
  {
    id: 1,
    title: 'New booking request',
    message: 'John Smith requested a deep tissue massage for tomorrow at 2pm',
    time: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
    avatar: '/avatars/john.jpg',
    action: '/bookings/123'
  },
  {
    id: 2,
    title: 'Payment received',
    message: 'Payment of $85.00 for session with Sarah Johnson has been processed',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    avatar: '/avatars/sarah.jpg',
    action: '/payments/456'
  },
  {
    id: 3,
    title: 'Therapist availability change',
    message: 'Michael Chen updated his availability for next week',
    time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    avatar: '/avatars/michael.jpg',
    action: '/therapists/789'
  }
];

export default function NotificationsPanel({ open, onClose }) {
  const [unreadCount, setUnreadCount] = React.useState(
    notifications.filter(n => !n.read).length
  );

  const markAsRead = (id) => {
    // In a real app, you would make an API call here
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      setUnreadCount(prev => prev - 1);
    }
  };

  const markAllAsRead = () => {
    // In a real app, you would make an API call here
    notifications.forEach(n => { n.read = true });
    setUnreadCount(0);
  };

  return (
    <StyledDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
    >
      <Header>
        <Typography variant="h6" component="div">
          Notifications
          {unreadCount > 0 && (
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        <Box>
          <Button 
            size="small" 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Header>
      <Divider />

      {notifications.length > 0 ? (
        <List sx={{ p: 0 }}>
          {notifications.map((notification) => (
            <React.Fragment key={notification.id}>
              <ListItem 
                alignItems="flex-start"
                secondaryAction={
                  !notification.read && (
                    <IconButton 
                      edge="end" 
                      onClick={() => markAsRead(notification.id)}
                    >
                      <UnreadIcon fontSize="small" color="primary" />
                    </IconButton>
                  )
                }
                sx={{
                  backgroundColor: notification.read ? 
                    'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar alt={notification.title} src={notification.avatar} />
                </ListItemAvatar>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        display="block"
                        mb={0.5}
                      >
                        {notification.message}
                      </Typography>
                      {formatDistanceToNow(notification.time, { addSuffix: true })}
                    </>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      ) : (
        <EmptyState>
          <NotificationIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll see notifications here when you have new messages or updates.
          </Typography>
        </EmptyState>
      )}
    </StyledDrawer>
  );
}