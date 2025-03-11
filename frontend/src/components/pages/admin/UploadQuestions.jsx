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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import apiService from '../../../services/api';
import { safeToUpperCase } from '../../../utils/stringUtils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

const UploadQuestions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [retryQueue, setRetryQueue] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  const validateQuestions = (questions) => {
    if (questions.length === 0) {
      throw new Error('The file contains no data. Please check your file format.');
    }
    
    // Check if the first row has the expected field names
    const firstRow = questions[0];
    const expectedFields = ['question', 'subject', 'year', 'answer', 'option1', 'option2', 'option3', 'option4'];
    const missingFields = expectedFields.filter(field => !Object.keys(firstRow).includes(field));
    
    if (missingFields.length > 0) {
      throw new Error(`The file is missing required columns: ${missingFields.join(', ')}. Please download and use the template.`);
    }
    
    const errors = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const rowNumber = i + 2; // Excel row number (1-indexed + header row)
      
      // Check for required fields
      if (!question.question) {
        errors.push(`Row ${rowNumber}: Missing question`);
      }
      
      if (!question.subject) {
        errors.push(`Row ${rowNumber}: Missing subject for question: "${question.question?.substring(0, 30)}..."`);
      }
      
      if (!question.year) {
        errors.push(`Row ${rowNumber}: Missing year for question: "${question.question?.substring(0, 30)}..."`);
      }
      
      if (!question.answer) {
        errors.push(`Row ${rowNumber}: Missing answer for question: "${question.question?.substring(0, 30)}..."`);
      }
      
      if (!question.option1 || !question.option2 || !question.option3 || !question.option4) {
        errors.push(`Row ${rowNumber}: Missing one or more options for question: "${question.question?.substring(0, 30)}..."`);
      }
      
      // Validate that answer is one of the options
      const answer = safeToUpperCase(question.answer);
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        errors.push(`Row ${rowNumber}: Invalid answer format. Must be A, B, C, or D for question: "${question.question?.substring(0, 30)}..."`);
      }
    }

    return errors;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length) {
      handleFileSelection(files[0]);
    }
  };

  const validateFile = (file) => {
    if (!file) return 'No file selected';
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload an Excel (.xlsx) or CSV file';
    }

    return null;
  };

  const handleFileSelection = async (file) => {
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setSelectedFile(file);
    setPreviewData([]);
    setValidationErrors([]);

    try {
      const questions = await readFile(file);
      const errors = validateQuestions(questions);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
      } else {
        setPreviewData(questions);
        setShowPreview(true);
      }
    } catch (err) {
      setError(err.message || 'Error processing file');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const questions = XLSX.utils.sheet_to_json(worksheet);
          resolve(questions);
        } catch (err) {
          reject(new Error('Error reading file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const uploadBatch = async (batch, retryCount = 0) => {
    try {
      const response = await apiService.admin.uploadQuestions({
        questions: batch,
        update_mode: updateMode
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error uploading questions');
      }
      
      return { success: true, count: batch.length };
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        // Add to retry queue
        setRetryQueue(prev => [...prev, { batch, retryCount: retryCount + 1 }]);
      }
      return {
        success: false,
        questions: batch,
        error: error.message
      };
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || previewData.length === 0) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setRetryQueue([]);
    setRetryCount(0);

    try {
      const totalBatches = Math.ceil(previewData.length / BATCH_SIZE);
      let failedQuestions = [];
      
      // Upload initial batches
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min((i + 1) * BATCH_SIZE, previewData.length);
        const batch = previewData.slice(start, end);
        
        const result = await uploadBatch(batch);
        if (!result.success) {
          failedQuestions = [...failedQuestions, ...result.questions];
        }
        
        setUploadProgress(((i + 1) / totalBatches) * 100);
      }

      // Process retry queue
      while (retryQueue.length > 0 && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        const currentQueue = [...retryQueue];
        setRetryQueue([]);
        
        for (const { batch, retryCount } of currentQueue) {
          const result = await uploadBatch(batch, retryCount);
          if (!result.success) {
            failedQuestions = [...failedQuestions, ...result.questions];
          }
        }
      }

      const successCount = previewData.length - failedQuestions.length;
      setSuccess(`Successfully uploaded ${successCount} questions!`);
      
      if (failedQuestions.length > 0) {
        setError(`Failed to upload ${failedQuestions.length} questions. You can download the failed records.`);
        // Save failed questions for download
        const ws = XLSX.utils.json_to_sheet(failedQuestions);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Failed');
        XLSX.writeFile(wb, 'failed_questions.xlsx');
      }

      setShowPreview(false);
      setSelectedFile(null);
      setPreviewData([]);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Error uploading questions');
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setRetryCount(0);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        question: 'Sample question text here?',
        option1: 'Option A',
        option2: 'Option B',
        option3: 'Option C',
        option4: 'Option D',
        answer: 'A',
        subject: 'Pharmaceutical Chemistry',
        year: '2023',
        degree: 'B.Pharm' // Optional field
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'question_upload_template.xlsx');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Upload Questions
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" paragraph>
            Upload questions in bulk using Excel (.xlsx) or CSV (.csv) format.
            Please ensure your file follows the required format.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Required fields:</strong> question, option1, option2, option3, option4, answer, subject, year
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Optional fields:</strong> degree
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The answer field must be one of: A, B, C, or D
          </Typography>
          <Button
            variant="outlined"
            onClick={downloadTemplate}
            sx={{ mb: 2 }}
          >
            Download Template
          </Button>
        </Box>

        <Box
          sx={{
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : '#ccc',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            bgcolor: isDragging ? 'rgba(25, 118, 210, 0.08)' : '#fafafa',
            transition: 'all 0.3s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            id="file-upload"
            type="file"
            onChange={(e) => handleFileSelection(e.target.files[0])}
            disabled={loading}
          />
          <label htmlFor="file-upload">
            <Typography variant="body1" gutterBottom>
              Drag and drop your file here, or
            </Typography>
            <Button
              component="span"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
            >
              Choose File
            </Button>
          </label>
          {loading && (
            <Box sx={{ mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {selectedFile && !loading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="primary">
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {previewData.length > 0 ? `${previewData.length} questions found` : 'Processing file...'}
              </Typography>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Errors:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </Box>
          </Alert>
        )}

        {/* Preview Dialog */}
        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Preview Questions
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={updateMode}
                      onChange={(e) => setUpdateMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Update Mode
                      <Tooltip title="When enabled, existing questions will be updated instead of creating duplicates">
                        <IconButton size="small">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent>
            {uploadProgress > 0 && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  Uploading... {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            )}
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Options</TableCell>
                    <TableCell>Answer</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((question, index) => (
                    <TableRow key={index}>
                      <TableCell>{question.question}</TableCell>
                      <TableCell>{question.subject}</TableCell>
                      <TableCell>{question.year}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body2">A: {question.option1}</Typography>
                          <Typography variant="body2">B: {question.option2}</Typography>
                          <Typography variant="body2">C: {question.option3}</Typography>
                          <Typography variant="body2">D: {question.option4}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={question.answer}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowPreview(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              color="primary"
              variant="contained"
              disabled={loading || previewData.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Uploading...' : `Upload ${previewData.length} Questions`}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default UploadQuestions;
