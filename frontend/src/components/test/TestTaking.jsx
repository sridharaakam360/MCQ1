import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Snackbar,
  useTheme
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import apiService from '../../services/api';

const MotionPaper = motion(Paper);

const TestTaking = ({ questions, onComplete, subjectId, examType }) => {
  const theme = useTheme();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [warningShown, setWarningShown] = useState(false);

  // Initialize timer from backend calculation
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        // Get timer calculation from backend
        const response = await apiService.test.calculateTime({
          questions: questions.length // Just send number of questions
        });

        if (response?.data?.success) {
          const { totalTimeInSeconds } = response.data.data;
          setTimeLeft(totalTimeInSeconds);
          console.log('Timer initialized with:', {
            totalTimeInSeconds,
            numQuestions: questions.length,
            breakdown: response.data.data.breakdown
          });
        } else {
          throw new Error(response?.data?.message || 'Failed to calculate test time');
        }
      } catch (err) {
        console.error('Error initializing timer:', err);
        const errorMessage = err.response?.data?.message || err.message;
        setError(`Failed to initialize test timer: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    if (questions && questions.length > 0) {
      initializeTimer();
    }
  }, [questions]);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft <= 0 || loading) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        // Show warning when 30 seconds remaining
        if (prev === 30 && !warningShown) {
          setWarningShown(true);
          setSnackbar({
            open: true,
            message: 'Warning: 30 seconds remaining! Test will be auto-submitted.',
            severity: 'warning'
          });
        }
        
        // Auto-submit when timer reaches 0
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading, warningShown]);

  const handleAnswerChange = (event) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: event.target.value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format answers as a map of questionId to answer (only for answered questions)
      const formattedAnswers = {};
      Object.entries(answers).forEach(([questionIndex, answer]) => {
        const questionId = questions[parseInt(questionIndex)].id;
        // Convert the selected answer to the corresponding option letter (A, B, C, D)
        const optionIndex = questions[parseInt(questionIndex)].options.indexOf(answer);
        const answerLetter = ['A', 'B', 'C', 'D'][optionIndex];
        formattedAnswers[questionId] = answerLetter;
      });

      // Calculate actual time taken in seconds
      const response = await apiService.test.calculateTime({
        questions: questions.length
      });
      const totalAllowedTime = response.data.data.totalTimeInSeconds;
      const timeTakenInSeconds = totalAllowedTime - timeLeft;

      // Get count of answered and unanswered questions
      const answeredCount = Object.keys(answers).length;
      const unansweredCount = questions.length - answeredCount;

      // Prepare test data
      const testData = {
        testData: {
          degree: examType,
          totalQuestions: questions.length,
          answeredQuestions: answeredCount,
          unansweredQuestions: unansweredCount,
          timeTaken: timeTakenInSeconds,
          questions: questions.map(q => q.id) // Add all question IDs
        },
        answers: formattedAnswers
      };

      console.log('Submitting test data:', {
        ...testData,
        timeDetails: {
          totalAllowedTime,
          timeLeft,
          timeTakenInSeconds,
          timeTakenFormatted: `${Math.floor(timeTakenInSeconds / 60)}:${(timeTakenInSeconds % 60).toString().padStart(2, '0')}`
        }
      });

      // Show confirmation dialog if there are unanswered questions
      if (unansweredCount > 0) {
        const confirmed = window.confirm(
          `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      const submitResponse = await apiService.test.submit(testData);
      console.log('Test submission response:', submitResponse);

      if (submitResponse?.data?.success) {
        setSnackbar({
          open: true,
          message: `Test submitted successfully. You answered ${answeredCount} out of ${questions.length} questions.`,
          severity: 'success'
        });
        onComplete(submitResponse.data.data);
      } else {
        throw new Error(submitResponse?.data?.message || 'Failed to submit test');
      }
    } catch (err) {
      console.error('Error submitting test:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit test';
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Add a function to check if current question is answered
  const isCurrentQuestionAnswered = () => {
    return !!answers[currentQuestion];
  };

  // Add visual indicator for unanswered questions in the stepper
  const getStepStyle = (index) => {
    if (unansweredQuestions.includes(index + 1)) {
      return {
        '& .MuiStepLabel-root .Mui-active': { color: theme.palette.warning.main },
        '& .MuiStepLabel-root .Mui-completed': { color: theme.palette.warning.main },
        '& .MuiStepLabel-root .Mui-error': { color: theme.palette.warning.main }
      };
    }
    return {};
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">MCQ Test</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimerIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">{formatTime(timeLeft)}</Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          {questions && questions.length > 0 ? (
            <>
              <Stepper activeStep={currentQuestion} sx={{ mb: 4 }}>
                {questions.map((_, index) => (
                  <Step key={index} sx={getStepStyle(index)}>
                    <StepLabel error={unansweredQuestions.includes(index + 1)}>
                      Question {index + 1}
                      {!answers[index] && ' ●'}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Question {currentQuestion + 1} of {questions.length}
                  {!isCurrentQuestionAnswered() && (
                    <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
                      (Not answered)
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body1" paragraph>
                  {questions[currentQuestion]?.question}
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={answers[currentQuestion] || ''}
                    onChange={handleAnswerChange}
                  >
                    {questions[currentQuestion]?.options?.map((option, index) => (
                      <FormControlLabel
                        key={index}
                        value={option}
                        control={<Radio />}
                        label={option}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<PrevIcon />}
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                {currentQuestion === questions.length - 1 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    Submit Test
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    endIcon={<NextIcon />}
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <Alert severity="error">No questions available. Please try again.</Alert>
          )}
        </Box>
      </MotionPaper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
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
    </Box>
  );
};

export default TestTaking; 