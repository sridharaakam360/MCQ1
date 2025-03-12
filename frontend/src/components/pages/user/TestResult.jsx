import React, { useState, useEffect } from 'react';

import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Container,
  CircularProgress,
  Alert,
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  Divider,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import apiService from '../../../services/api';

const MotionContainer = motion(Container);

const QuestionAnalysis = ({ question, index }) => {
  const [expanded, setExpanded] = useState(false);

  // Convert option letter to index (A=0, B=1, etc.)
  const getOptionIndex = (optionLetter) => {
    return optionLetter ? optionLetter.charCodeAt(0) - 'A'.charCodeAt(0) : -1;
  };

  // Get selected and correct option indices
  const selectedOptionIndex = question.selectedOption ? getOptionIndex(question.selectedOption) : -1;
  const correctOptionIndex = question.correctOption ? getOptionIndex(question.correctOption) : -1;

  // Convert options array to object with letters
  const optionsWithLetters = question.options.reduce((acc, option, index) => {
    const letter = String.fromCharCode(65 + index);
    acc[letter] = option;
    return acc;
  }, {});

  return (
    <>
      <ListItem
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          bgcolor: question.isUnanswered ? 'warning.light' : 'background.paper',
          borderRadius: 1,
          mb: 1,
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Question {index + 1}</Typography>
            {question.isUnanswered ? (
              <Chip
                icon={<CancelIcon />}
                label="Not Answered"
                color="warning"
                size="small"
              />
            ) : question.isCorrect ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="Correct"
                color="success"
                size="small"
              />
            ) : (
              <Chip
                icon={<CancelIcon />}
                label="Incorrect"
                color="error"
                size="small"
              />
            )}
          </Box>
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Box sx={{ width: '100%' }}>
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
            {question.question}
          </Typography>

          <Grid container spacing={2}>
            {Object.entries(optionsWithLetters).map(([letter, optionText]) => {
              const isSelected = letter === question.selectedOption;
              const isCorrect = letter === question.correctOption;
              let backgroundColor = 'background.paper';
              let borderColor = 'divider';
              
              if (isCorrect) {
                backgroundColor = 'success.light';
                borderColor = 'success.main';
              } else if (isSelected && !isCorrect) {
                backgroundColor = 'error.light';
                borderColor = 'error.main';
              }

              return (
                <Grid item xs={12} sm={6} key={letter}>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: backgroundColor,
                      border: '1px solid',
                      borderColor: borderColor,
                      position: 'relative',
                      '&::before': isSelected || isCorrect ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: isCorrect ? 'success.main' : 'error.main',
                      } : {},
                    }}
                  >
                    <Typography>
                      {letter}. {optionText}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                Analysis:
              </Typography>
              <Box sx={{ pl: 2, borderLeft: '4px solid', borderColor: 'info.main' }}>
                <Typography variant="body2" paragraph>
                  {question.isUnanswered ? (
                    <>
                      You did not answer this question. The correct answer is <strong>{question.correctOption}</strong> ({optionsWithLetters[question.correctOption]}).
                    </>
                  ) : question.isCorrect ? (
                    <>
                      You selected option <strong>{question.selectedOption}</strong> ({optionsWithLetters[question.selectedOption]}), which is correct!
                    </>
                  ) : (
                    <>
                      You selected option <strong>{question.selectedOption}</strong> ({optionsWithLetters[question.selectedOption]}), but the correct answer is <strong>{question.correctOption}</strong> ({optionsWithLetters[question.correctOption]}).
                    </>
                  )}
                </Typography>
                {question.explanation && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Explanation:
                    </Typography>
                    <Typography variant="body2">
                      {question.explanation}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Collapse>
        </Box>
      </ListItem>
      <Divider />
    </>
  );
};

const TestResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try to get result from navigation state
        if (location.state?.result) {
          const result = location.state.result;
          // If coming from test submission, fetch full details
          if (result.resultId) {
            const response = await apiService.test.getResults(result.resultId);
            if (response?.data?.success) {
              setTestResult(response.data.data);
            } else {
              setTestResult(result);
            }
          } else {
            setTestResult(result);
          }
          setLoading(false);
          return;
        }

        // If no state, fetch from API using testId
        if (!testId) {
          throw new Error('Test ID not found');
        }

        const response = await apiService.test.getResults(testId);
        console.log('Test result response:', response);
        
        if (!response?.data?.success) {
          throw new Error('Failed to fetch test result');
        }

        setTestResult(response.data.data);
      } catch (err) {
        console.error('Error fetching test result:', err);
        setError(err.message || 'Failed to load test result');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [testId, location.state]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/test-history')}
            startIcon={<ArrowBackIcon />}
          >
            Back to Test History
          </Button>
        </Box>
      </Container>
    );
  }

  if (!testResult) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>Test result not found</Alert>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/test-history')}
            startIcon={<ArrowBackIcon />}
          >
            Back to Test History
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <MotionContainer
      maxWidth="lg"
      sx={{ py: 4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>Test Result</Typography>
            {testResult.subject && (
              <Typography variant="subtitle1" color="textSecondary">
                Subject: {testResult.subject.name}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>Score</Typography>
              <Typography 
                variant="h4" 
                color={testResult.score >= 40 ? 'success.main' : 'error.main'}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
              >
                {testResult.score}%
                {testResult.score >= 40 ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <CancelIcon color="error" />
                )}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {testResult.score >= 40 ? 'Passed' : 'Failed'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>Questions</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {testResult.correctAnswers}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Correct</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="error.main">
                    {testResult.incorrectAnswers}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Incorrect</Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {testResult.unansweredQuestions}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Unanswered</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Total: {testResult.totalQuestions}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>Time Taken</Typography>
              <Typography variant="h4">
                {Math.floor(testResult.timeTaken / 60)}:{(testResult.timeTaken % 60).toString().padStart(2, '0')}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Minutes : Seconds
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>Accuracy</Typography>
              <Typography variant="h4" color="primary.main">
                {Math.round((testResult.correctAnswers / testResult.totalQuestions) * 100)}%
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {testResult.correctAnswers} out of {testResult.totalQuestions}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Detailed Analysis Section */}
        {testResult.questions && testResult.questions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              Detailed Analysis
            </Typography>
            <List>
              {testResult.questions.map((question, index) => (
                <QuestionAnalysis
                  key={index}
                  question={question}
                  index={index}
                />
              ))}
            </List>
          </Box>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/test')}
          >
            Take Another Test
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
          >
            View Dashboard
          </Button>
        </Box>
      </Paper>
    </MotionContainer>
  );
};

export default TestResultPage; 