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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import apiClient from '../../services/apiClient';
import { loginSuccess } from '../../store/authSlice';
import useAuth from '../../hooks/useAuth';
import SpaImage from '../../assets/images/spa-wellness.jpg';

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

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    spaName: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/admin';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.fullName || !formData.email || !formData.spaName || !formData.password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/signup', formData);

      if (response.data?.success) {
        // Auto-login after successful signup
        dispatch(loginSuccess({ user: response.data.user, token: response.data.token }));
        navigate(from, { replace: true });
      } else {
        setError(response.data.message || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again later.');
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

  const messages = [
    "Transform your spa operations with intelligent management.",
    "Reduce no-shows by 60% with automated reminders.",
    "Save 15+ hours weekly with streamlined scheduling.",
    "Join 1,200+ spa professionals already using Spavana."
  ];

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
        {/* Left Side - Signup Form */}
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
              <PersonAddIcon />
            </Avatar>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Start Your Journey
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
              Create your account and transform your spa business today.
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
                id="fullName"
                label="Full Name"
                name="fullName"
                autoComplete="name"
                autoFocus
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={loading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="spaName"
                label="Spa or Business Name"
                name="spaName"
                autoComplete="organization"
                value={formData.spaName}
                onChange={handleInputChange}
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
                autoComplete="new-password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                helperText="Minimum 8 characters"
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Start Free Trial'}
              </Button>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Button
                    variant="text"
                    onClick={() => navigate('/login')}
                    sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                  >
                    Sign In
                  </Button>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

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
            src={SpaImage}
            alt="Spa Wellness"
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
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                fontSize: '1.1rem',
                minHeight: '2.5em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

          {/* Trust Signals */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              🔒 Bank-level security • 💚 HIPAA-level protection • ⚡ 24/7 support
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Trusted by 1,200+ spa professionals worldwide
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}