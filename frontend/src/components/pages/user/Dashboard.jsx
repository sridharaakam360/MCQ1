import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import apiService from '../../../services/api';
import ExportUtils from '../../../utils/exportUtils';

const MotionPaper = motion(Paper);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [filters, setFilters] = useState({
    subject: 'all',
    status: 'all'
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchTestHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.test.getHistory(user?.id);
      console.log('Test history response:', response);
      
      if (!response?.data?.success) {
        throw new Error('Failed to fetch test history');
      }

      setTestHistory(response.data.tests || []);
    } catch (err) {
      console.error('Error fetching test history:', err);
      setError(err.message || 'Failed to load test history');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTestHistory();
  }, [fetchTestHistory]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />;
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const exportToPDF = () => {
    handleExportMenuClose();
    const columns = [
      { header: 'Subject', key: 'subject' },
      { header: 'Score (%)', key: 'score' },
      { header: 'Time Taken', key: 'timeTaken' },
      { header: 'Date', key: 'completedAt' },
      { header: 'Status', key: 'status' }
    ];

    const formattedData = filteredTests.map(test => ({
      subject: test.subject?.name || '',
      score: test.score,
      timeTaken: formatTime(test.timeTaken),
      completedAt: new Date(test.completedAt).toLocaleDateString(),
      status: test.score >= 40 ? 'Passed' : 'Failed'
    }));

    ExportUtils.exportToPDF({
      data: formattedData,
      columns,
      title: 'Test History Report',
      filename: 'test-history'
    });
  };

  const exportToExcel = () => {
    handleExportMenuClose();
    const columns = [
      { header: 'Subject', key: 'subject' },
      { header: 'Score (%)', key: 'score' },
      { header: 'Time Taken', key: 'timeTaken' },
      { header: 'Date', key: 'completedAt' },
      { header: 'Status', key: 'status' }
    ];

    const formattedData = testHistory.map(test => ({
      subject: test.subject?.name || '',
      score: test.score,
      timeTaken: formatTime(test.timeTaken),
      completedAt: new Date(test.completedAt).toLocaleDateString(),
      status: test.score >= 40 ? 'Passed' : 'Failed'
    }));

    ExportUtils.exportToExcel({
      data: formattedData,
      columns,
      filename: 'test-history',
      sheetName: 'Test Results'
    });
  };

  const handleViewResult = (test) => {
    navigate(`/test-result/${test.id}`);
  };

  const filteredTests = testHistory
    .filter(test => {
      const matchesSearch = test.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.score?.toString().includes(searchTerm);
      const matchesSubject = filters.subject === 'all' || test.subject?.name === filters.subject;
      const matchesStatus = filters.status === 'all' || 
        (filters.status === 'passed' && test.score >= 40) ||
        (filters.status === 'failed' && test.score < 40);
      return matchesSearch && matchesSubject && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'subject_name') {
        aValue = a.subject?.name || '';
        bValue = b.subject?.name || '';
      } else if (sortField === 'created_at') {
        aValue = new Date(a.completedAt).getTime();
        bValue = new Date(b.completedAt).getTime();
      }
      
      const direction = sortDirection === 'asc' ? 1 : -1;
      return aValue > bValue ? direction : -direction;
    });

  const paginatedTests = filteredTests.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

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
        <Alert severity="error">{error}</Alert>
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
            Welcome, {user?.first_name || user?.name || 'User'}
          </Typography>

          <Grid container spacing={3}>
            {/* Test History Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">Test History</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        size="small"
                        placeholder="Search tests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Subject</InputLabel>
                        <Select
                          value={filters.subject}
                          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                          label="Subject"
                        >
                          <MenuItem value="all">All Subjects</MenuItem>
                          {Array.from(new Set(testHistory.map(test => test.subject?.name)))
                            .filter(Boolean)
                            .map((subject) => (
                              <MenuItem key={subject} value={subject}>
                                {subject}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          label="Status"
                        >
                          <MenuItem value="all">All Status</MenuItem>
                          <MenuItem value="passed">Passed</MenuItem>
                          <MenuItem value="failed">Failed</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportMenuOpen}
                      >
                        Export
                      </Button>
                    </Box>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell
                            onClick={() => handleSort('subject_name')}
                            sx={{ cursor: 'pointer' }}
                          >
                            Subject {getSortIcon('subject_name')}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('score')}
                            sx={{ cursor: 'pointer' }}
                          >
                            Score {getSortIcon('score')}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('timeTaken')}
                            sx={{ cursor: 'pointer' }}
                          >
                            Time Taken {getSortIcon('timeTaken')}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('created_at')}
                            sx={{ cursor: 'pointer' }}
                          >
                            Date {getSortIcon('created_at')}
                          </TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedTests.map((test) => (
                          <TableRow key={test.id}>
                            <TableCell>{test.subject?.name}</TableCell>
                            <TableCell>{test.score}%</TableCell>
                            <TableCell>{formatTime(test.timeTaken)}</TableCell>
                            <TableCell>
                              {new Date(test.completedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={test.score >= 40 ? 'Passed' : 'Failed'}
                                color={test.score >= 40 ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleViewResult(test)}
                                color="primary"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        Showing {Math.min(filteredTests.length, page * rowsPerPage)} of {filteredTests.length} tests
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(e.target.value);
                            setPage(1);
                          }}
                        >
                          <MenuItem value={5}>5 / page</MenuItem>
                          <MenuItem value={10}>10 / page</MenuItem>
                          <MenuItem value={25}>25 / page</MenuItem>
                          <MenuItem value={50}>50 / page</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                      <IconButton
                        disabled={page * rowsPerPage >= filteredTests.length}
                        onClick={() => setPage(page + 1)}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </MotionPaper>

      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={exportToPDF}>
          <ListItemIcon>
            <PdfIcon />
          </ListItemIcon>
          <ListItemText primary="Export as PDF" />
        </MenuItem>
        <MenuItem onClick={exportToExcel}>
          <ListItemIcon>
            <ExcelIcon />
          </ListItemIcon>
          <ListItemText primary="Export as Excel" />
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Dashboard; 