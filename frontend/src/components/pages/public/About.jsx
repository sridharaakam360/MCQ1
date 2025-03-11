import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Avatar,
  useTheme,
  Button
} from '@mui/material';
import {
  School as SchoolIcon,
  Timeline as TimelineIcon,
  Group as GroupIcon,
  Lightbulb as LightbulbIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MotionCard = motion(Card);
const MotionTypography = motion(Typography);

const About = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const features = [
    {
      title: 'Expert-Curated Content',
      description: 'Our questions are carefully crafted by experienced pharmacy professionals and academicians.',
      icon: <SchoolIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Performance Analytics',
      description: 'Track your progress with detailed analytics and performance insights.',
      icon: <TimelineIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Community Learning',
      description: 'Join a community of pharmacy students preparing for competitive exams.',
      icon: <GroupIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Smart Practice',
      description: 'Adaptive learning system that focuses on your weak areas.',
      icon: <LightbulbIcon fontSize="large" color="primary" />,
    },
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
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box 
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        sx={{ py: 6 }}
      >
        {/* Hero Section */}
        <Box 
          sx={{ 
            textAlign: 'center', 
            mb: 8,
            px: { xs: 2, md: 8 }
          }}
        >
          <MotionTypography 
            variant="h2" 
            gutterBottom
            variants={itemVariants}
            sx={{ 
              fontWeight: 'bold',
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.75rem' }
            }}
          >
            About GPAT Prep
          </MotionTypography>
          <MotionTypography 
            variant="h5" 
            color="text.secondary"
            paragraph
            variants={itemVariants}
            sx={{ mb: 4 }}
          >
            We are dedicated to helping pharmacy students achieve their dreams through comprehensive exam preparation.
          </MotionTypography>
          <motion.div variants={itemVariants}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/signup')}
              endIcon={<ArrowForwardIcon />}
              sx={{ 
                px: 4,
                py: 1.5,
                borderRadius: 2
              }}
            >
              Start Your Journey
            </Button>
          </motion.div>
        </Box>

        {/* Features Section */}
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <MotionCard
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: theme.shadows[8]
                }}
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{ 
                        bgcolor: 'primary.light',
                        width: 56,
                        height: 56,
                        mr: 2
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="h5" 
                        gutterBottom
                        sx={{ fontWeight: 'bold' }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        color="text.secondary"
                        sx={{ lineHeight: 1.7 }}
                      >
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>

        {/* Mission Section */}
        <Box 
          component={motion.div}
          variants={itemVariants}
          sx={{ 
            mt: 8,
            p: 4,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 4,
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            Our Mission
          </Typography>
          <Typography variant="body1" paragraph sx={{ maxWidth: 800, mx: 'auto' }}>
            To provide high-quality, accessible, and comprehensive preparation materials for pharmacy entrance exams, 
            helping students achieve their academic and professional goals through innovative learning solutions.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default About;