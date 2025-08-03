import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as ClientsIcon,
  SupervisorAccount as StaffIcon,
  Psychology as TherapistsIcon,
  MedicalServices as ServicesIcon,
  Event as BookingsIcon,
  NotificationsActive as RemindersIcon,
  Assessment as ReportsIcon,
  NoteAlt as ClinicalNotesIcon,
  Schedule as ScheduleIcon,
  PersonalVideo as MyScheduleIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Import your auth hook

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'selected'
})(({ theme, selected }) => ({
  borderRadius: theme.shape.borderRadius,
  margin: theme.spacing(0.3, 0.25),
  padding: theme.spacing(1, 1.25),
  color: '#ffffff',
  fontSize: '0.475rem',
  ...(selected && {
    backgroundColor: alpha('#ffffff', 0.12),
    '& .MuiListItemIcon-root': {
      color: '#ffffff',
    },
    '&:hover': {
      backgroundColor: alpha('#ffffff', 0.2),
    },
  }),
  '&:hover': {
    backgroundColor: alpha('#ffffff', 0.08),
  },
  transition: 'all 0.2s ease',
}));


// Define all menu items with their role-based access
const allMenuItems = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/admin/dashboard',
    roles: ['admin', 'user', 'therapist', 'client', 'staff'], // All roles can see dashboard
  },
  {
    text: 'My Customers',
    icon: <ClientsIcon />,
    path: '/admin/clients',
    roles: ['admin', 'staff'],
  },
  {
    text: 'Clinical Notes',
    icon: <ClinicalNotesIcon />,
    path: '/admin/clinical-notes',
    roles: ['admin', 'staff', 'therapist'],
  },
  {
    text: 'Staff',
    icon: <StaffIcon />,
    path: '/admin/users',
    roles: ['admin'],
  },
  {
    text: 'Therapists',
    icon: <TherapistsIcon />,
    path: '/admin/therapists',
    roles: ['admin'],
  },
  {
    text: 'Services',
    icon: <ServicesIcon />,
    path: '/admin/services',
    roles: ['admin', 'staff', 'therapist'],
  },
  {
    text: 'Bookings',
    icon: <BookingsIcon />,
    path: '/admin/bookings',
    roles: ['admin', 'therapist', 'staff'],
  },
  {
    text: 'Schedule',
    icon: <ScheduleIcon />,
    path: '/admin/schedule',
    roles: ['admin', 'staff'],
  },
  {
    text: 'My Schedule',
    icon: <MyScheduleIcon />,
    path: '/admin/myschedule',
    roles: ['therapist'],
  },
  {
    text: 'Reminders',
    icon: <RemindersIcon />,
    path: '/admin/reminders',
    roles: ['admin', 'staff'],
  },
  {
    text: 'Reports',
    icon: <ReportsIcon />,
    path: '/admin/reports/revenue',
    roles: ['admin'],
    subItems: [
      { text: 'Revenue', path: '/admin/reports/revenue' },
      { text: 'Booking Stats', path: '/admin/reports/stats' },
    ],
  },
   {
    text: 'configuration',
    icon: <SettingsIcon />,
    path: '/admin/settings',
    roles: ['admin', 'staff'],
  },
];

export default function NavigationMenu({ variant, }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
   const { user } = useAuth();
  const [openSubmenus, setOpenSubmenus] = React.useState({});

  const isCollapsed = variant === 'collapsed';

  // Filter menu items based on user role - only show items the user has access to
  const menuItems = React.useMemo(() => {
   const role = user?.role?.toLowerCase() || '';
    const filteredItems = allMenuItems.filter(item =>
      item.roles.includes(role)
    );
    
    // Debug log to see what items are visible for each role
    // console.log(`Menu items for ${role}:`, filteredItems.map(item => item.text));
    
    return filteredItems;
  }, [user]);

  const handleClick = (item) => {
    if (item.subItems) {
      setOpenSubmenus((prev) => ({
        ...prev,
        [item.path]: !prev[item.path],
      }));
    } else {
      navigate(item.path);
    }
  };

  const isItemSelected = (item) => {
    if (location.pathname === item.path) return true;
    if (item.subItems) {
      return item.subItems.some((subItem) => location.pathname === subItem.path);
    }
    return location.pathname.startsWith(item.path + '/');
  };

  const isSubItemSelected = (subItem) => location.pathname === subItem.path;

  React.useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems) {
        const hasSelectedSubItem = item.subItems.some(
          (subItem) => location.pathname === subItem.path
        );
        if (hasSelectedSubItem) {
          setOpenSubmenus((prev) => ({
            ...prev,
            [item.path]: true,
          }));
        }
      }
    });
  }, [location.pathname, menuItems]);

  return (
    <List component="nav" sx={{ p: 1 }}>
      {menuItems.map((item) => {
        const selected = isItemSelected(item);
        const subMenuOpen = openSubmenus[item.path];

        return (
          <React.Fragment key={item.path}>
            <Tooltip
              title={isCollapsed ? item.text : ''}
              placement="right"
              disableHoverListener={!isCollapsed}
            >
              <ListItem disablePadding>
                <StyledListItemButton
                  selected={selected}
                  onClick={() => handleClick(item)}
                  sx={{
                    justifyContent: isCollapsed ? 'center' : 'initial',
                    px: isCollapsed ? 2 : 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: '#ffffff',
                      minWidth: isCollapsed ? 'auto' : 40,
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  {!isCollapsed && (
                    <>
                      <ListItemText primary={item.text} />
                      {item.subItems && (subMenuOpen ? <ExpandLess /> : <ExpandMore />)}
                    </>
                  )}
                </StyledListItemButton>
              </ListItem>
            </Tooltip>

            {!isCollapsed && item.subItems && (
              <Collapse in={subMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.subItems.map((subItem) => (
                    <ListItem key={subItem.path} disablePadding>
                      <StyledListItemButton
                        selected={isSubItemSelected(subItem)}
                        onClick={() => navigate(subItem.path)}
                        sx={{ pl: 7 }}
                      >
                        <ListItemText primary={subItem.text} />
                      </StyledListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
}