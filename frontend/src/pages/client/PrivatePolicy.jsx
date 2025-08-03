import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
  Card,
  CardContent,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  Security,
  Shield,
  Info,
  Email,
  Phone,
  CheckCircle,
  Warning,
  Delete,
  Download,
  Edit,
  ArrowBack,
  Gavel,
  Lock,
  People,
  Storage,
  Visibility,
  Update
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const PolicyContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  maxWidth: '900px'
}));

const HeaderCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  textAlign: 'center'
}));

const SectionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius
}));

const ContactCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(3),
  background: theme.palette.grey[50],
  border: `1px solid ${theme.palette.primary.light}`
}));

const RightsCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(2),
  background: theme.palette.success.light + '10',
  border: `1px solid ${theme.palette.success.light}`
}));

const LastUpdated = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3)
}));

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState('panel1');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const businessInfo = {
    name: 'Algo Software Labs Spa',
    address: '123 Main St, City, Country Side California',
    phone: '+12347019606522',
    email: 'spa@algosoftwarelabs.com',
    website: 'https://spa.algosoftwarelabs.com'
  };

  const privacySections = [
    {
      id: 'panel1',
      title: 'Information We Collect',
      icon: <Storage />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>Personal Information</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Contact Information" 
                secondary="Name, email address, phone number, postal address"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Medical Information" 
                secondary="Health conditions, allergies, medications, physical limitations"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Appointment Data" 
                secondary="Booking details, service preferences, treatment history"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Emergency Contact" 
                secondary="Emergency contact name, phone number, relationship"
              />
            </ListItem>
          </List>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Technical Information</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Info color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="Usage Data" 
                secondary="IP address, browser type, device information, website interactions"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Info color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="Cookies & Analytics" 
                secondary="Session data, preferences, website performance metrics"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel2',
      title: 'How We Use Your Information',
      icon: <Visibility />,
      content: (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            We only use your personal data for legitimate business purposes and with your consent.
          </Alert>
          
          <Typography variant="h6" gutterBottom>Primary Uses</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="Service Delivery" 
                secondary="Booking appointments, providing treatments, maintaining health records"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="Communication" 
                secondary="Appointment confirmations, reminders, health-related communications"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="Safety & Care" 
                secondary="Medical history tracking, allergy alerts, emergency contact purposes"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="Legal Compliance" 
                secondary="Meeting healthcare regulations, maintaining required records"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>With Your Additional Consent</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Email color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Marketing Communications" 
                secondary="Promotional offers, wellness tips, new service announcements"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Info color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Service Improvement" 
                secondary="Anonymous analytics to improve our services and website"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel3',
      title: 'Legal Basis for Processing',
      icon: <Gavel />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Under GDPR, we process your personal data based on the following legal grounds:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon><Shield color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Contractual Necessity" 
                secondary="Processing necessary to provide the spa services you've booked and maintain our agreement with you"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Legal Obligation" 
                secondary="Compliance with healthcare regulations, tax requirements, and safety standards"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText 
                primary="Your Consent" 
                secondary="Marketing communications, optional data collection, website analytics (where required)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><People color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="Legitimate Interest" 
                secondary="Fraud prevention, security monitoring, business analytics (where balanced against your rights)"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel4',
      title: 'Data Sharing & Disclosure',
      icon: <People />,
      content: (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            We never sell your personal information to third parties.
          </Alert>
          
          <Typography variant="h6" gutterBottom>Limited Sharing Circumstances</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Security color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Healthcare Providers" 
                secondary="Only with your explicit consent for referrals or coordinated care"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Gavel color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="Legal Requirements" 
                secondary="When required by law, court orders, or regulatory authorities"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Shield color="error" /></ListItemIcon>
              <ListItemText 
                primary="Emergency Situations" 
                secondary="Medical emergencies requiring immediate care coordination"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Storage color="info" /></ListItemIcon>
              <ListItemText 
                primary="Service Providers" 
                secondary="Trusted vendors (payment processors, email services) under strict data protection agreements"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>International Transfers</Typography>
          <Typography variant="body2" color="text.secondary">
            If we transfer your data outside the EU/EEA, we ensure appropriate safeguards are in place, 
            such as adequacy decisions or standard contractual clauses approved by the European Commission.
          </Typography>
        </Box>
      )
    },
    {
      id: 'panel5',
      title: 'Data Security & Retention',
      icon: <Lock />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>Security Measures</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Lock color="success" /></ListItemIcon>
              <ListItemText 
                primary="Encryption" 
                secondary="All data encrypted in transit (SSL/TLS) and at rest (AES-256)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="success" /></ListItemIcon>
              <ListItemText 
                primary="Access Controls" 
                secondary="Role-based access, multi-factor authentication, regular access reviews"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Shield color="success" /></ListItemIcon>
              <ListItemText 
                primary="Infrastructure" 
                secondary="Secure cloud hosting, regular security updates, vulnerability monitoring"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><People color="success" /></ListItemIcon>
              <ListItemText 
                primary="Staff Training" 
                secondary="Regular privacy and security training for all personnel"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Data Retention</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Update color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Active Client Records" 
                secondary="Retained while you remain an active client and for legitimate business purposes"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Storage color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Medical Records" 
                secondary="Retained for 7 years after last treatment (as required by healthcare regulations)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Delete color="secondary" /></ListItemIcon>
              <ListItemText 
                primary="Marketing Data" 
                secondary="Deleted within 2 years of last interaction unless you renew consent"
              />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      id: 'panel6',
      title: 'Your Rights Under GDPR',
      icon: <Shield />,
      content: (
        <Box>
          <RightsCard>
            <CardContent>
              <Typography variant="h6" gutterBottom color="success.main">
                You Have the Right To:
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon><Visibility color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Access Your Data" 
                    secondary="Request a copy of all personal data we hold about you"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Edit color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Rectification" 
                    secondary="Correct any inaccurate or incomplete personal data"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Delete color="error" /></ListItemIcon>
                  <ListItemText 
                    primary="Erasure ('Right to be Forgotten')" 
                    secondary="Request deletion of your personal data (subject to legal requirements)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Warning color="warning" /></ListItemIcon>
                  <ListItemText 
                    primary="Restrict Processing" 
                    secondary="Limit how we use your data in certain circumstances"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Download color="info" /></ListItemIcon>
                  <ListItemText 
                    primary="Data Portability" 
                    secondary="Receive your data in a structured, machine-readable format"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Security color="secondary" /></ListItemIcon>
                  <ListItemText 
                    primary="Object to Processing" 
                    secondary="Object to processing based on legitimate interests or for marketing"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Shield color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Withdraw Consent" 
                    secondary="Withdraw consent at any time (doesn't affect past lawful processing)"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>How to Exercise Your Rights:</strong> Contact us using the details below. 
                  We'll respond within 30 days and may request identity verification for security.
                </Typography>
              </Alert>
            </CardContent>
          </RightsCard>
        </Box>
      )
    },
    {
      id: 'panel7',
      title: 'Cookies & Website Analytics',
      icon: <Info />,
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>Cookie Categories</Typography>
          
          <Box sx={{ mb: 2 }}>
            <Chip 
              label="Essential Cookies" 
              color="success" 
              size="small" 
              sx={{ mr: 1, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Required for website functionality (login sessions, security, booking system)
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Chip 
              label="Functional Cookies" 
              color="info" 
              size="small" 
              sx={{ mr: 1, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Remember your preferences (language, accessibility settings)
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Chip 
              label="Analytics Cookies" 
              color="warning" 
              size="small" 
              sx={{ mr: 1, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Help us understand website usage (Google Analytics, performance monitoring)
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Chip 
              label="Marketing Cookies" 
              color="secondary" 
              size="small" 
              sx={{ mr: 1, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              Track effectiveness of marketing campaigns (only with your consent)
            </Typography>
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              You can manage cookie preferences through your browser settings or our cookie banner. 
              Essential cookies cannot be disabled as they're necessary for the website to function.
            </Typography>
          </Alert>
        </Box>
      )
    }
  ];

  return (
    <PolicyContainer>
      {/* Header */}
      <HeaderCard elevation={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <IconButton 
            onClick={handleBack} 
            sx={{ color: 'white' }}
            aria-label="Go back"
          >
            <ArrowBack />
          </IconButton>
          <Box flex={1} textAlign="center">
            <Shield sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h3" gutterBottom>
              Privacy Policy
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Your privacy is our priority. Learn how we protect your personal data.
            </Typography>
          </Box>
          <Box width={48} /> {/* Spacer for centering */}
        </Box>
      </HeaderCard>

      {/* Last Updated */}
      <LastUpdated>
        <Typography variant="body2" color="text.secondary">
          Last Updated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Effective Date: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
      </LastUpdated>

      {/* Introduction */}
      <SectionCard elevation={1}>
        <Typography variant="h5" gutterBottom>
          Introduction
        </Typography>
        <Typography variant="body1" paragraph>
          {businessInfo.name} ("we," "our," or "us") is committed to protecting your privacy and personal data. 
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
          visit our website, book our services, or interact with us.
        </Typography>
        <Typography variant="body1" paragraph>
          This policy complies with the General Data Protection Regulation (GDPR), applicable data protection 
          laws, and healthcare privacy regulations. By using our services, you acknowledge that you have read 
          and understood this Privacy Policy.
        </Typography>
        <Alert severity="success">
          <Typography variant="body2">
            <strong>Key Principle:</strong> We only collect and use personal data that is necessary for 
            providing our spa services and with appropriate legal basis under GDPR.
          </Typography>
        </Alert>
      </SectionCard>

      {/* Privacy Sections */}
      {privacySections.map((section) => (
        <Accordion
          key={section.id}
          expanded={expanded === section.id}
          onChange={handleChange(section.id)}
          elevation={1}
          sx={{ mb: 1 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls={`${section.id}-content`}
            id={`${section.id}-header`}
            sx={{ 
              '& .MuiAccordionSummary-content': { 
                alignItems: 'center',
                gap: 2
              }
            }}
          >
            {section.icon}
            <Typography variant="h6">{section.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {section.content}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Data Protection Officer & Contact */}
      <ContactCard>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Contact Us About Privacy
          </Typography>
          <Typography variant="body1" paragraph>
            If you have questions about this Privacy Policy, want to exercise your rights, 
            or need to report a privacy concern, please contact us:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <Email color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  <strong>Email:</strong> {businessInfo.email}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Phone color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  <strong>Phone:</strong> {businessInfo.phone}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Postal Address:</strong><br />
                {businessInfo.name}<br />
                {businessInfo.address}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            <strong>Response Time:</strong> We'll respond to privacy requests within 30 days. 
            For urgent matters, please call us directly.
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Supervisory Authority:</strong> You have the right to lodge a complaint with 
              your local data protection authority if you believe we've violated your privacy rights.
            </Typography>
          </Alert>
        </CardContent>
      </ContactCard>

      {/* Footer Actions */}
      <Box display="flex" justifyContent="center" gap={2} mt={4}>
        <Button 
          variant="outlined" 
          onClick={handleBack}
          startIcon={<ArrowBack />}
        >
          Go Back
        </Button>
        <Button 
          variant="contained" 
          onClick={() => window.print()}
          startIcon={<Download />}
        >
          Download/Print
        </Button>
      </Box>
    </PolicyContainer>
  );
};

export default PrivacyPolicy;