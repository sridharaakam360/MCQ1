import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Skeleton,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  Group as GroupIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionContainer = motion(Box);
const MotionTypography = motion(Typography);
const MotionPaper = motion(Paper);

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTests: 0,
    averageScore: 0,
    activeUsers: 0
  });

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      // Simulated API call
      const response = await new Promise(resolve => 
        setTimeout(() => resolve({
          totalUsers: 5000,
          totalTests: 25000,
          averageScore: 75.5,
          activeUsers: 1200
        }), 1000)
      );
      setStats(response);
    } catch (error) {
      console.error('Error fetching home data:', error);
      setError('Failed to fetch home data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const features = [
    {
      icon: <SchoolIcon fontSize="large" color="primary" />,
      title: 'Comprehensive Practice',
      description: 'Access thousands of GPAT and NIPER practice questions with detailed explanations'
    },
    {
      icon: <TimelineIcon fontSize="large" color="primary" />,
      title: 'Performance Tracking',
      description: 'Monitor your progress with detailed analytics and performance insights'
    },
    {
      icon: <CheckCircleIcon fontSize="large" color="primary" />,
      title: 'Mock Tests',
      description: 'Take full-length mock tests under exam-like conditions'
    },
    {
      icon: <GroupIcon fontSize="large" color="primary" />,
      title: 'Community Support',
      description: 'Join a community of pharmacy aspirants and share knowledge'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        when: "beforeChildren",
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
    <Container>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Hero Section */}
        <MotionContainer
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            py: { xs: 6, md: 12 },
            mb: 6,
            borderRadius: { xs: 0, md: 4 },
            mt: 2,
            boxShadow: 3
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <MotionTypography 
                  variant="h2" 
                  gutterBottom
                  variants={itemVariants}
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '2.5rem', md: '3.75rem' }
                  }}
                >
                  Ace Your Pharmacy Entrance Exams
                </MotionTypography>
                <MotionTypography 
                  variant="h5" 
                  paragraph
                  variants={itemVariants}
                  sx={{ mb: 4 }}
                >
                  Comprehensive preparation platform for GPAT, NIPER, and other pharmacy entrance exams
                </MotionTypography>
                <motion.div variants={itemVariants}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/signup')}
                    sx={{ 
                      mr: 2, 
                      mb: { xs: 2, md: 0 },
                      px: 4,
                      py: 1.5,
                      borderRadius: 2
                    }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="large"
                    onClick={() => navigate('/about')}
                    sx={{ 
                      px: 4,
                      py: 1.5,
                      borderRadius: 2
                    }}
                  >
                    Learn More
                  </Button>
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.img
                  src="/assets/study.svg"
                  alt="Study Illustration"
                  style={{ 
                    width: '100%', 
                    maxWidth: 500,
                    filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.2))'
                  }}
                  variants={itemVariants}
                />
              </Grid>
            </Grid>
          </Container>
        </MotionContainer>

        {/* Stats Section */}
        <Container maxWidth="lg" sx={{ mb: 8 }}>
          <Grid container spacing={3}>
            {loading ? (
              Array(4).fill(0).map((_, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <Skeleton 
                    variant="rectangular" 
                    height={100} 
                    sx={{ borderRadius: 2 }}
                  />
                </Grid>
              ))
            ) : (
              <>
                <Grid item xs={6} md={3}>
                  <MotionPaper
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    <Typography variant="h4" color="primary">
                      {stats.totalUsers.toLocaleString()}+
                    </Typography>
                    <Typography variant="subtitle1">Active Users</Typography>
                  </MotionPaper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <MotionPaper
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    <Typography variant="h4" color="primary">
                      {stats.totalTests.toLocaleString()}+
                    </Typography>
                    <Typography variant="subtitle1">Tests Taken</Typography>
                  </MotionPaper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <MotionPaper
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    <Typography variant="h4" color="primary">
                      {stats.averageScore}%
                    </Typography>
                    <Typography variant="subtitle1">Average Score</Typography>
                  </MotionPaper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <MotionPaper
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    <Typography variant="h4" color="primary">
                      {stats.activeUsers.toLocaleString()}+
                    </Typography>
                    <Typography variant="subtitle1">Daily Active Users</Typography>
                  </MotionPaper>
                </Grid>
              </>
            )}
          </Grid>
        </Container>

        {/* Features Section */}
        <Container maxWidth="lg" sx={{ mb: 8 }}>
          <MotionTypography 
            variant="h3" 
            align="center" 
            gutterBottom
            variants={itemVariants}
            sx={{ fontWeight: 'bold', mb: 4 }}
          >
            Why Choose Us?
          </MotionTypography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <MotionPaper
                  elevation={3}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: theme.shadows[6]
                  }}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    borderRadius: 2,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {feature.icon}
                  <Typography variant="h6" sx={{ my: 2, fontWeight: 'bold' }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </MotionPaper>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Exam Information Section */}
        <Box 
          sx={{ 
            bgcolor: 'grey.100', 
            py: 8,
            borderRadius: { xs: 0, md: 4 },
            mb: 4
          }}
        >
          <Container maxWidth="lg">
            <MotionTypography 
              variant="h3" 
              align="center" 
              gutterBottom
              variants={itemVariants}
              sx={{ fontWeight: 'bold', mb: 4 }}
            >
              Popular Pharmacy Entrance Exams
            </MotionTypography>
            <Grid container spacing={4}>
              {['GPAT', 'NIPER', 'Other Exams'].map((exam, index) => (
                <Grid item xs={12} md={4} key={exam}>
                  <MotionContainer
                    variants={itemVariants}
                    whileHover={{ scale: 1.03 }}
                  >
                    <Card 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        overflow: 'hidden',
                        boxShadow: 3
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="200"
                        image={`/assets/${exam.toLowerCase().replace(' ', '-')}.jpg`}
                        alt={`${exam} Exam`}
                        sx={{
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {exam}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {exam === 'GPAT' && 'Graduate Pharmacy Aptitude Test (GPAT) is a national level entrance exam for admission to M.Pharm programs.'}
                          {exam === 'NIPER' && 'National Institute of Pharmaceutical Education and Research entrance exam for M.Pharm, MBA, and Ph.D programs.'}
                          {exam === 'Other Exams' && 'Various state-level and university-specific pharmacy entrance examinations.'}
                        </Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => navigate('/syllabus')}
                          fullWidth
                          sx={{ 
                            mt: 2,
                            borderRadius: 2,
                            py: 1
                          }}
                        >
                          View Syllabus
                        </Button>
                      </CardContent>
                    </Card>
                  </MotionContainer>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
