import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  CssBaseline,
  Divider,
  IconButton,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  ChevronLeft,
  ChevronRight,
  
} from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { styled, useTheme, alpha } from '@mui/material/styles';
import NavigationMenu from '../navigation/NavigationMenu'; 

// Constants
const drawerWidth = 240;
const collapsedWidth = 72;

// Styled Components
const Main = styled('main', {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'drawerWidth',
})(({ theme, open, drawerWidth }) => ({
  flexGrow: 1,
  height: '100vh',
  padding: theme.spacing(3),
  width: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
  marginLeft: 0, // Remove margin, use width calculation instead
  transition: theme.transitions.create(['width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    marginLeft: 0,
  },
    // Hide scrollbar but keep scrolling
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': {
    display: 'none', // Webkit browsers
  },
  '-ms-overflow-style': 'none', // IE/Edge
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'drawerWidth',
})(({ theme, open, drawerWidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderRadius: '0',
  borderBottom: `1px solid ${theme.palette.divider}`,
  width: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
  marginLeft: open ? drawerWidth : collapsedWidth,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    marginLeft: 0,
  },
}));

const DrawerStyled = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    height: '100vh',
    overflowY: 'auto',
    backgroundColor: '#123456',
    color: theme.palette.primary.contrastText,
    borderRight: `1px solid ${theme.palette.divider}`,
    boxSizing: 'border-box',
    borderRadius: '0',
    whiteSpace: 'nowrap',
    fontSize: '0.9rem',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    // Hide scrollbar but keep scrolling functionality
    scrollbarWidth: 'none', // Firefox
    '&::-webkit-scrollbar': {
      display: 'none', // Webkit browsers
    },
    '-ms-overflow-style': 'none', // IE and Edge
  },
}));

// Enhanced gradient border avatar with better sizing
const GradientAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  fontWeight: 600,
  fontSize: '0.75rem',
  color: theme.palette.common.white,
  backgroundColor: theme.palette.grey[800],
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  border: '2px solid transparent',
  backgroundClip: 'padding-box',
  position: 'relative',
  userSelect: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    padding: '2px',
    background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c)',
    borderRadius: 'inherit',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'subtract',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    zIndex: -1,
  },
}));

// Global scrollbar styles
const GlobalScrollbarStyles = styled('div')(({ theme }) => ({
  // Thin transparent scrollbar (still barely visible)
  '&::-webkit-scrollbar': {
    width: '4px',
    height: '4px',
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'transparent',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.2), // Show on hover
  },
  scrollbarWidth: 'thin', // Firefox
  scrollbarColor: 'transparent transparent', // Firefox
}));

// Map user roles to initials
const roleInitialsMap = {
  admin: 'ADM',
  staff: 'STF',
  therapist: 'THP',
  client: 'CLT',
  user: 'USR',
};

export default function ManagementLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Updated to destructure forceLogoutUser from useAuth
  const { user, logout, forceLogoutUser } = useAuth();

  // Drawer state: mobile open, desktop open/collapsed
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  // Profile menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Toggle drawer for mobile or desktop
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  // Profile menu handlers
  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogoutClick = () => setLogoutConfirmOpen(true);

  // Updated confirmLogout function
  const confirmLogout = () => {
    // Use forceLogoutUser for complete session cleanup
    forceLogoutUser();
    setLogoutConfirmOpen(false);
    navigate('/admin/login');
  };

  // Compute drawer width based on desktop open state
  const currentDrawerWidth = desktopOpen ? drawerWidth : collapsedWidth;

  // User full name and role initials
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const roleInitials = roleInitialsMap[user?.role?.toLowerCase()] || 'USR';

  return (
    <GlobalScrollbarStyles>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />

        <AppBarStyled
          position="fixed"
          open={!isMobile && desktopOpen}
          drawerWidth={currentDrawerWidth}
        >
          <Toolbar sx={{ pr: '24px' }}>
            {/* Hamburger menu icon */}
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              sx={{
                marginRight: '36px',
                ...(desktopOpen && !isMobile && { display: 'none' }),
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Welcome message */}
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                flexGrow: 1,
                fontWeight: 500,
                color: theme.palette.text.primary,
              }}
            >
              {fullName ? `Welcome, ${fullName}` : 'Welcome'}
            </Typography>

            {/* Profile avatar with role initials */}
            <Tooltip title="Account settings" arrow>
              <IconButton
                onClick={handleProfileMenuOpen}
                size="small"
                sx={{ ml: 2, p: 0 }}
                aria-controls={anchorEl ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={anchorEl ? 'true' : undefined}
              >
                <GradientAvatar>{roleInitials}</GradientAvatar>
              </IconButton>
            </Tooltip>

            {/* Profile menu */}
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 8,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 4px 16px rgba(0,0,0,0.15))',
                  mt: 1.5,
                  borderRadius: 2,
                  minWidth: 180,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '& .MuiMenuItem-root': {
                    borderRadius: 1,
                    mx: 1,
                    my: 0.5,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => navigate('/admin/users/profile')}>
                <ListItemIcon>
                  <ProfileIcon fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              {/* <MenuItem onClick={() => navigate('/settings')}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem> */}
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleLogoutClick} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBarStyled>

        {/* Desktop Drawer */}
        {!isMobile && (
          <DrawerStyled
            variant="permanent"
            open={desktopOpen}
            sx={{
              width: currentDrawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: currentDrawerWidth,
              },
            }}
          >
            <Toolbar
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                px: [1],
                minHeight: '64px !important',
              }}
            >
              <IconButton 
                onClick={handleDrawerToggle}
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
              >
                {theme.direction === 'rtl' ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Toolbar>
            <Divider sx={{ backgroundColor: alpha(theme.palette.common.white, 0.2) }} />
            <NavigationMenu variant={desktopOpen ? 'expanded' : 'collapsed'} />
          </DrawerStyled>
        )}

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { 
                width: drawerWidth,
                backgroundColor: '#123456',
                color: theme.palette.primary.contrastText,
              },
            }}
          >
            <Toolbar
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                px: [1],
                minHeight: '64px !important',
              }}
            >
              <IconButton 
                onClick={handleDrawerToggle}
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
              >
                {theme.direction === 'rtl' ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Toolbar>
            <Divider sx={{ backgroundColor: alpha(theme.palette.common.white, 0.2) }} />
            <NavigationMenu variant="expanded" />
          </Drawer>
        )}

        {/* Main content */}
        <Main open={desktopOpen && !isMobile} drawerWidth={currentDrawerWidth}>
          <Toolbar />
          <Box 
            sx={{ 
              flex: 1, 
              overflowY: 'auto',
              height: 'calc(100vh - 64px - 48px)', // Account for toolbar and padding
              width: '100%',
            }}
          >
            <Outlet />
          </Box>
        </Main>

        {/* Logout confirmation dialog */}
        <Dialog 
          open={logoutConfirmOpen} 
          onClose={() => setLogoutConfirmOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              minWidth: 300,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Confirm Logout</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button 
              onClick={() => setLogoutConfirmOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmLogout} 
              color="error" 
              variant="contained"
              autoFocus
              sx={{ borderRadius: 2 }}
            >
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </GlobalScrollbarStyles>
  );
}