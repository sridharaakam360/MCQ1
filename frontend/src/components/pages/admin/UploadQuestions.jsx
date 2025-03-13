import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import apiService from '../../../services/api';

const UploadQuestions = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const onDrop = useCallback(acceptedFiles => {
    // Filter out files that are not Excel
    const excelFiles = acceptedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );

    if (excelFiles.length < acceptedFiles.length) {
      setUploadError('Only Excel files (.xlsx, .xls) are allowed');
      return;
    }

    setFiles(excelFiles);
    setUploadError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    multiple: false
  });
  
  const steps = ['Select File', 'Upload File', 'Review Results'];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFiles([{
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'ready'
      }]);
      setActiveStep(1);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiService.admin.getQuestionTemplate();
      
      // Create a download link for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'question-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      setUploadError('Failed to download template. Please try again.');
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setFiles(newFiles);
    setActiveStep(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);
      
      const formData = new FormData();
      formData.append('file', files[0].file);
      
      const response = await apiService.admin.uploadQuestions(formData);
      
      if (response?.data?.success) {
        setUploadSuccess(true);
        setUploadResults(response.data.data);
        setActiveStep(2);
      } else {
        throw new Error(response?.data?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading questions:', error);
      setUploadError(error.message || 'Failed to upload questions. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setUploadSuccess(false);
    setUploadError(null);
    setUploadResults(null);
    setActiveStep(0);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                >
                  Choose File
                </Button>
              </label>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Supported formats: .xlsx, .xls, .csv
              </Typography>
            </Paper>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                sx={{ mt: 2 }}
              >
                Download Template
              </Button>
            </Box>
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ mt: 4 }}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>{file.name}</TableCell>
                      <TableCell>{file.type}</TableCell>
                      <TableCell>{(file.size / 1024).toFixed(2)} KB</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveFile(index)}
                          disabled={uploading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={handleBack}
                disabled={uploading}
                startIcon={<ArrowBackIcon />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                startIcon={uploading ? <CircularProgress size={24} /> : <CloudUploadIcon />}
              >
                {uploading ? 'Uploading...' : 'Upload Questions'}
              </Button>
            </Box>
            
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ mt: 4 }}>
            {uploadSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Questions uploaded successfully!
              </Alert>
            )}
            
            {uploadResults && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Total Questions
                      </Typography>
                      <Typography variant="h3" color="primary">
                        {uploadResults.totalProcessed || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Successfully Added
                      </Typography>
                      <Typography variant="h3" color="success.main">
                        {uploadResults.successCount || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Errors
                      </Typography>
                      <Typography variant="h3" color="error.main">
                        {uploadResults.errorCount || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
            
            {uploadResults?.errors && uploadResults.errors.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Error Details
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadResults.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row || 'N/A'}</TableCell>
                          <TableCell>{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            {uploadResults?.subjects && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Questions by Subject
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(uploadResults.subjects).map(([subject, count]) => (
                    <Chip 
                      key={subject}
                      label={`${subject}: ${count}`}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RefreshIcon />}
              >
                Upload Another File
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/admin/dashboard')}
              >
                Return to Dashboard
              </Button>
            </Box>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Upload Questions
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderStepContent(activeStep)}
      </Paper>
    </Container>
  );
};

export default UploadQuestions;
