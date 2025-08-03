import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
  Box,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  PointOfSale as PointOfSaleIcon,
  People as PeopleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const apps = [
  {
    name: 'Admin Dashboard',
    icon: <DashboardIcon />,
    path: '/admin',
    description: 'Management and analytics'
  },
  {
    name: 'Booking Calendar',
    icon: <CalendarIcon />,
    path: '/calendar',
    description: 'Schedule appointments'
  },
  {
    name: 'Point of Sale',
    icon: <PointOfSaleIcon />,
    path: '/pos',
    description: 'Checkout and payments'
  },
  {
    name: 'Client Portal',
    icon: <PeopleIcon />,
    path: '/clients',
    description: 'Client management'
  },
  {
    name: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    description: 'System configuration'
  }
];

export default function AppSwitcher() {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Tooltip title="Switch applications">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2 }}
          aria-controls={open ? 'app-switcher-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <DashboardIcon fontSize="small" />
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="app-switcher-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            width: 320,
            maxWidth: '100%',
            p: 1,
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
              borderRadius: 0
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Typography variant="subtitle2" sx={{ p: 2 }}>
          Switch Applications
        </Typography>
        {apps.map((app) => (
          <MenuItem key={app.name} sx={{ borderRadius: 1, mb: 0.5 }}>
            <ListItemIcon>
              <Avatar
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.main'
                }}
              >
                {app.icon}
              </Avatar>
            </ListItemIcon>
            <Box>
              <Typography variant="body1">{app.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {app.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}