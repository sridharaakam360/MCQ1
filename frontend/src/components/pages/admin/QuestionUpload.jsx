import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import { Upload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';

const MotionPaper = motion(Paper);

const QuestionUpload = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleTemplateDownload = async () => {
    try {
      setLoading(true);
      const response = await apiService.admin.getQuestionTemplate();
      
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'question_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template');
      console.error('Error downloading template:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);

      await apiService.admin.uploadQuestions(formData);
      setSuccess('Questions uploaded successfully');

      // Reset form
      setFile(null);
      e.target.reset();

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/questions');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload questions');
      console.error('Error uploading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Upload Questions
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
          )}

          <Box sx={{ mb: 4 }}>
            <Typography variant="body1" gutterBottom>
              Download the template file to see the required format for uploading questions.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleTemplateDownload}
              disabled={loading}
              sx={{ mr: 2 }}
            >
              Download Template
            </Button>
          </Box>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <input
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                id="question-file"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="question-file">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                  disabled={loading}
                >
                  Select File
                </Button>
                {file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected file: {file.name}
                  </Typography>
                )}
              </label>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !file}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Upload'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/questions')}
              >
                Cancel
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            <Typography variant="body2" paragraph>
              1. Download the template file using the button above
            </Typography>
            <Typography variant="body2" paragraph>
              2. Fill in the questions following the template format
            </Typography>
            <Typography variant="body2" paragraph>
              3. Save the file and upload it using the form above
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Note: The file must be in Excel format (.xlsx or .xls)
            </Typography>
          </Box>
        </Box>
      </MotionPaper>
    </Container>
  );
};

export default QuestionUpload; 