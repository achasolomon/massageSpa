import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  createTheme,
  ThemeProvider,
  keyframes,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import apiClient from '../../services/apiClient';
import { loginSuccess } from '../../store/authSlice';
import useAuth from '../../hooks/useAuth';
import Skeleton from '../../assets/images/deeptissue2.jpg'

// Animation for sliding text in from left
const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;
const blink = keyframes`
  from, to { border-color: transparent }
  50% { border-color: white }
`;

const theme = createTheme();

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/admin';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.data?.success) {
        dispatch(loginSuccess({ user: response.data.user, token: response.data.token }));
        navigate(from, { replace: true });
      } else {
        setError(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  function useTypewriterSequence(messages, speed = 60, pause = 2000) {
    const [text, setText] = useState('');
    const [msgIndex, setMsgIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
      let timer;

      const currentMsg = messages[msgIndex];

      if (!isDeleting && charIndex <= currentMsg.length) {
        timer = setTimeout(() => {
          setText(currentMsg.slice(0, charIndex));
          setCharIndex((prev) => prev + 1);
        }, speed);
      } else if (!isDeleting && charIndex > currentMsg.length) {
        timer = setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && charIndex >= 0) {
        timer = setTimeout(() => {
          setText(currentMsg.slice(0, charIndex));
          setCharIndex((prev) => prev - 1);
        }, speed / 2);
      } else {
        setIsDeleting(false);
        setMsgIndex((prev) => (prev + 1) % messages.length);
      }

      return () => clearTimeout(timer);
    }, [messages, msgIndex, charIndex, isDeleting, speed, pause]);

    return text;
  }
  const messages = isAuthenticated
  ? [""] // <-- At least one valid string
  : ["Relax, rejuvenate, and we'll handle the rest."];

const animatedText = useTypewriterSequence(messages, 50, 2000);


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Side - Login Form */}
        <Box
          sx={{
            flex: 1,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: 8,
            clipPath: 'polygon(0 0, 90% 0, 100% 100%, 0% 100%)',
            zIndex: 2,
          }}
        >
          <Box sx={{ maxWidth: 420, mx: 'auto' }}>
            <Avatar sx={{ bgcolor: 'secondary.main', mb: 2, mx: 'auto' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
              Sign in to manage your massage appointments and clients easily.
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Slanted divider line */}
        <Box
        // sx={{
        //   position: 'absolute',
        //   top: 0,
        //   bottom: 0,
        //   left: '90%',
        //   width: '6px',
        //   bgcolor: 'secondary.main',
        //   clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        //   transform: 'skewX(-15deg)',
        //   zIndex: 3,
        //   boxShadow: '0 0 10px rgba(100,110,255,0.7)',
        // }}
        />

        {/* Right Side - Image and Text */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'primary.dark',
            color: 'white',
            px: 6,
            mt: 0,
            clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Image container */}
          <Box
            component="img"
            src={Skeleton} // Adjust the path as nee
            alt="Massage Therapy"
            sx={{
              maxWidth: '280px',
              borderRadius: '12px',
              mb: 4,
              mt: 4,
              boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
              animation: `${slideIn} 1.2s ease forwards`,
            }}
          />

          {/* Animated Text */}
          <Box
            sx={{
              maxWidth: 380,
              animation: `${slideIn} 1.5s ease forwards`,
              animationDelay: '0.5s',
              opacity: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                fontSize: '1.1rem',
              }}
            >
              {animatedText}
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: '1ch',
                  borderRight: '2px solid white',
                  animation: `${blink} 1s step-end infinite`,
                  ml: 0.5,
                }}
              />
            </Typography>
          </Box>

        </Box>
      </Box>
    </ThemeProvider>
  );
}
