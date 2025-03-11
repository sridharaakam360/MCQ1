import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  Snackbar
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../../services/api';

const MotionContainer = motion(Box);
const MotionCard = motion(Card);

const Contact = () => {
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters'),
    email: Yup.string()
      .required('Email is required')
      .email('Invalid email address'),
    subject: Yup.string()
      .required('Subject is required')
      .min(5, 'Subject must be at least 5 characters')
      .max(100, 'Subject must be less than 100 characters'),
    message: Yup.string()
      .required('Message is required')
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message must be less than 1000 characters')
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await apiService.contact.submitForm(values);
        setSnackbar({
          open: true,
          message: 'Thank you for your message. We will get back to you soon!',
          severity: 'success'
        });
        resetForm();
      } catch (error) {
        console.error('Error submitting contact form:', error);
        setSnackbar({
          open: true,
          message: error.response?.data?.message || 'Failed to send message. Please try again.',
          severity: 'error'
        });
      } finally {
        setSubmitting(false);
      }
    }
  });

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const contactInfo = [
    {
      icon: <EmailIcon fontSize="large" color="primary" />,
      title: 'Email',
      content: 'support@gpatprep.com',
      link: 'mailto:support@gpatprep.com'
    },
    {
      icon: <PhoneIcon fontSize="large" color="primary" />,
      title: 'Phone',
      content: '+91 XXX XXX XXXX',
      link: 'tel:+91XXXXXXXXXX'
    },
    {
      icon: <LocationIcon fontSize="large" color="primary" />,
      title: 'Address',
      content: 'Mumbai, Maharashtra, India',
      link: 'https://maps.google.com/?q=Mumbai,Maharashtra,India'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <Container maxWidth="lg">
      <MotionContainer
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        sx={{ py: 6 }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <motion.div variants={itemVariants}>
            <Typography 
              variant="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '2.5rem', md: '3.75rem' }
              }}
            >
              Contact Us
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Have questions? We'd love to hear from you.
            </Typography>
          </motion.div>
        </Box>

        <Grid container spacing={4}>
          {/* Contact Info Cards */}
          <Grid item xs={12} md={4}>
            <Box>
              {contactInfo.map((info, index) => (
                <MotionCard
                  key={index}
                  component="a"
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: theme.shadows[8]
                  }}
                  sx={{ 
                    mb: 2, 
                    cursor: 'pointer',
                    textDecoration: 'none',
                    borderRadius: 2,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: 'primary.light',
                          mr: 2
                        }}
                      >
                        {info.icon}
                      </Box>
                      <Box>
                        <Typography 
                          variant="h6" 
                          sx={{ fontWeight: 'bold' }}
                        >
                          {info.title}
                        </Typography>
                        <Typography color="text.secondary">
                          {info.content}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </MotionCard>
              ))}
            </Box>
          </Grid>

          {/* Contact Form */}
          <Grid item xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 4,
                  borderRadius: 2
                }}
              >
                <form onSubmit={formik.handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                        disabled={formik.isSubmitting}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.email && Boolean(formik.errors.email)}
                        helperText={formik.touched.email && formik.errors.email}
                        disabled={formik.isSubmitting}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Subject"
                        name="subject"
                        value={formik.values.subject}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.subject && Boolean(formik.errors.subject)}
                        helperText={formik.touched.subject && formik.errors.subject}
                        disabled={formik.isSubmitting}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Message"
                        name="message"
                        multiline
                        rows={4}
                        value={formik.values.message}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.message && Boolean(formik.errors.message)}
                        helperText={formik.touched.message && formik.errors.message}
                        disabled={formik.isSubmitting}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        disabled={formik.isSubmitting}
                        endIcon={formik.isSubmitting ? <CircularProgress size={24} /> : <SendIcon />}
                        sx={{ 
                          py: 1.5,
                          borderRadius: 2
                        }}
                      >
                        {formik.isSubmitting ? 'Sending...' : 'Send Message'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </MotionContainer>
    </Container>
  );
};

export default Contact;
