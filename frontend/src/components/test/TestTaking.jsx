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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);

  useEffect(() => {
    console.log('TestTaking received questions:', questions);
    console.log('Current question:', questions[currentQuestion]);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

      // Check for unanswered questions
      const notAnswered = questions.reduce((acc, _, index) => {
        if (!answers[index]) {
          acc.push(index + 1);
        }
        return acc;
      }, []);

      if (notAnswered.length > 0) {
        setUnansweredQuestions(notAnswered);
        setError(`Please answer all questions before submitting. Unanswered questions: ${notAnswered.join(', ')}`);
        setSnackbar({
          open: true,
          message: `Please answer questions: ${notAnswered.join(', ')}`,
          severity: 'warning'
        });
        setLoading(false);
        return;
      }

      // Format answers as a map of questionId to answer
      const formattedAnswers = {};
      Object.entries(answers).forEach(([questionIndex, answer]) => {
        const questionId = questions[parseInt(questionIndex)].id;
        // Convert the selected answer to the corresponding option letter (A, B, C, D)
        const optionIndex = questions[parseInt(questionIndex)].options.indexOf(answer);
        const answerLetter = ['A', 'B', 'C', 'D'][optionIndex];
        formattedAnswers[questionId] = answerLetter;
      });

      // Prepare test data
      const testData = {
        testData: {
          degree: examType,
          totalQuestions: questions.length,
          timeTaken: 3600 - timeLeft
        },
        answers: formattedAnswers
      };

      console.log('Submitting test data:', testData);

      const response = await apiService.test.submit(testData);
      console.log('Test submission response:', response);

      if (response?.data?.success) {
        setUnansweredQuestions([]);
        console.log('Test submitted successfully, calling onComplete with:', response.data.data);
        setSnackbar({
          open: true,
          message: 'Test submitted successfully',
          severity: 'success'
        });
        onComplete(response.data.data);
      } else {
        throw new Error(response?.data?.message || 'Failed to submit test');
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