import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useAuth } from '../../../contexts/AuthContext';
import apiService from '../../../services/api';
import TestTaking from '../../../components/test/TestTaking';

const MotionPaper = motion(Paper);

const MCQTest = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit, isConnected } = useWebSocket();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [filters, setFilters] = useState({
    exams: [],
<<<<<<< HEAD
    subjects: []
  });
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
=======
    subjects: [],
    years: []
  });
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
  const [testStarted, setTestStarted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching filters from:', `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/tests/filters`);
      const response = await apiService.test.getFilters();
      console.log('Raw API Response:', response);

      if (response?.data?.success) {
        // Log the raw data
        console.log('Raw filters data:', response.data.data);

        // Ensure we have all required arrays, using empty arrays as fallbacks
        const rawData = response.data.data || {};
        console.log('Processing raw data:', rawData);

        const exams = Array.isArray(rawData.exams) ? rawData.exams : 
                     Array.isArray(rawData.degrees) ? rawData.degrees : [];
        const subjects = Array.isArray(rawData.subjects) ? rawData.subjects : [];
<<<<<<< HEAD
=======
        const years = Array.isArray(rawData.years) ? rawData.years : [];
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
        
        // Log each filter type
        console.log('Processed exam types:', exams);
        console.log('Processed subjects:', subjects);
<<<<<<< HEAD
=======
        console.log('Processed years:', years);
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98

        if (exams.length === 0) {
          console.warn('No exam types found in the response');
          setError('No exam types available. Please contact administrator.');
        }

        setFilters({
          exams,
<<<<<<< HEAD
          subjects
=======
          subjects,
          years
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
        });
      } else {
        console.error('Failed to fetch filters:', {
          success: response?.data?.success,
          message: response?.data?.message,
          data: response?.data?.data
        });
        setError('Failed to load filters: ' + (response?.data?.message || 'Unknown error'));
<<<<<<< HEAD
        setFilters({ exams: [], subjects: [] });
=======
        setFilters({ exams: [], subjects: [], years: [] });
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
      }
    } catch (error) {
      console.error('Error fetching filters:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError('Failed to load filters. Please try again later. Error: ' + (error.message || 'Unknown error'));
<<<<<<< HEAD
      setFilters({ exams: [], subjects: [] });
=======
      setFilters({ exams: [], subjects: [], years: [] });
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
    } finally {
      setLoading(false);
    }
  }, []);

  // Add an effect to log filters state changes
  useEffect(() => {
    console.log('Current filters state:', {
      exams: filters.exams,
      examCount: filters.exams.length,
      subjects: filters.subjects,
<<<<<<< HEAD
      subjectCount: filters.subjects.length
=======
      subjectCount: filters.subjects.length,
      years: filters.years,
      yearCount: filters.years.length
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
    });
  }, [filters]);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedExam) {
        setError('Please select an exam type');
        setQuestions([]);
        setLoading(false);
        return;
      }

      console.log('Fetching questions with params:', {
        count: 10,
        degree: selectedExam,
<<<<<<< HEAD
        subject_id: selectedSubject || undefined
=======
        subject_id: selectedSubject || undefined,
        year: selectedYear || undefined
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
      });

      const response = await apiService.test.getQuestions({
        count: 10,
        degree: selectedExam,
<<<<<<< HEAD
        subject_id: selectedSubject || undefined
=======
        subject_id: selectedSubject || undefined,
        year: selectedYear || undefined
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
      });
      
      console.log('Questions API response:', response);
      
      if (response?.data?.success) {
        // Transform the questions data structure
        const transformedQuestions = response.data.data.map(q => {
          console.log('Processing question:', q);
          
          // Handle options object
          let optionsArray = [];
          if (q.options && typeof q.options === 'object') {
            // If options is an object with A, B, C, D keys
            optionsArray = ['A', 'B', 'C', 'D'].map(key => q.options[key]).filter(Boolean);
          } else if (Array.isArray(q.options)) {
            // If options is already an array
            optionsArray = q.options;
          } else {
            // If options are individual fields
            optionsArray = [
              q.option1 || q.optionA,
              q.option2 || q.optionB,
              q.option3 || q.optionC,
              q.option4 || q.optionD
            ].filter(Boolean);
          }

          const transformed = {
            id: q.id,
            question: q.question,
            options: optionsArray,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty || q.degree,
            subject: {
              id: q.subject_id || q.subjectId,
              name: q.subject_name || q.subjectName
            }
          };
          console.log('Transformed question:', transformed);
          return transformed;
        });
        
        console.log('Final transformed questions:', transformedQuestions);
        setQuestions(transformedQuestions);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
<<<<<<< HEAD
      // Get the specific error message from the API response if available
      const errorMessage = err.response?.data?.message || 'Failed to fetch questions. Please try again.';
      setError(errorMessage);
=======
      setError('Failed to fetch questions. Please try again.');
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
      setQuestions([]);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, [selectedExam, selectedSubject]);
=======
  }, [selectedExam, selectedSubject, selectedYear]);
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    if (!testStarted) {
      fetchQuestions();
    }
  }, [fetchQuestions, testStarted]);

  const handleTestComplete = async (result) => {
    try {
      console.log('Test completed, received result:', result);
      
      setSnackbar({
        open: true,
        message: 'Test submitted successfully!',
        severity: 'success'
      });

      // Fetch complete test result including questions and answers
      const response = await apiService.test.getResults(result.resultId);
      if (!response?.data?.success) {
        throw new Error('Failed to fetch test result details');
      }

      const completeResult = response.data.data;
      console.log('Complete test result:', completeResult);

      // Navigate to the result page with the complete result
      const path = `/test-result/${result.resultId}`;
      console.log('Navigating to:', path);
      
      navigate(path, { 
        state: { result: completeResult },
        preventScrollReset: true
      });
    } catch (error) {
      console.error('Error handling test completion:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error processing test result',
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCancelTest = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = () => {
    setTestStarted(false);
    setShowConfirmDialog(false);
    setQuestions([]);
    fetchQuestions(); // Refresh questions for next attempt
  };

  const handleCloseConfirmDialog = () => {
    setShowConfirmDialog(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading test...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            MCQ Test
          </Typography>

          {error && (
            <>
              <Alert 
                severity={error.includes('select an exam') ? 'warning' : 'info'}
                sx={{ 
                  mb: 2,
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                <Typography variant="body1" gutterBottom>
                  {error}
                </Typography>
                {error.includes('No questions found') && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Suggestions:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      <li>Try selecting a different exam type</li>
                      <li>Try selecting a different subject</li>
<<<<<<< HEAD
                      <li>If the problem persists, contact the administrator</li>
=======
                      <li>Clear the year filter to see more questions</li>
                      <li>If the problem persists, try again later</li>
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
                    </ul>
                  </Box>
                )}
              </Alert>
            </>
          )}

          {!testStarted ? (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }} required>
                <InputLabel>Exam Type</InputLabel>
                <Select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  label="Exam Type *"
                >
                  <MenuItem value="">Select Exam Type</MenuItem>
                  {(filters.exams || []).map((exam) => (
                    <MenuItem key={exam.name} value={exam.name}>
                      {exam.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  label="Subject"
                >
                  <MenuItem value="">All Subjects</MenuItem>
                  {(filters.subjects || []).map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

<<<<<<< HEAD
=======
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Year"
                >
                  <MenuItem value="">All Years</MenuItem>
                  {(filters.years || []).map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
              <Button
                variant="contained"
                onClick={() => {
                  setError('');
                  setSelectedExam('');
                  setSelectedSubject('');
<<<<<<< HEAD
=======
                  setSelectedYear('');
>>>>>>> 486250f304fba193f3b11edefa2257fe404d5f98
                  fetchQuestions();
                }}
                sx={{ mb: 2 }}
                fullWidth
              >
                Reset Filters
              </Button>

              <Button
                variant="contained"
                onClick={() => setTestStarted(true)}
                disabled={!questions.length || !selectedExam}
                color="primary"
                fullWidth
              >
                Start Test
              </Button>
            </Box>
          ) : (
            <>
              <TestTaking
                questions={questions}
                testId={Date.now().toString()}
                degree={selectedExam}
                examType={selectedExam}
                onComplete={handleTestComplete}
                timeLimit={3600}
                showTimer={true}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancelTest}
                >
                  Cancel Test
                </Button>
              </Box>
            </>
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

      <Dialog
        open={showConfirmDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Cancel Test?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to cancel the test? Your progress will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Continue Test
          </Button>
          <Button onClick={handleConfirmCancel} color="error" autoFocus>
            Cancel Test
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MCQTest; 