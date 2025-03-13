import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';

const UsersList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [activeMenuUser, setActiveMenuUser] = useState(null);

  const fetchUsers = async (pageNum = page, limit = rowsPerPage, search = searchQuery) => {
    try {
      setLoading(true);
      setError(null);

      // Verify admin access before making the request
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await apiService.admin.getUsers({
        page: pageNum + 1, // API uses 1-based indexing
        limit,
        search: search.trim() || undefined
      });

      if (response?.data?.success) {
        setUsers(response.data.users || []);
        setTotalUsers(response.data.pagination?.total || 0);
      } else {
        throw new Error(response?.data?.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      let errorMessage = 'An error occurred while fetching users';
      let shouldRedirect = false;
      let redirectPath = '';

      switch (err.response?.status) {
        case 403:
          errorMessage = 'You do not have permission to access this resource.';
          shouldRedirect = true;
          redirectPath = '/dashboard';
          break;
        case 401:
          errorMessage = 'Your session has expired. Please log in again.';
          shouldRedirect = true;
          redirectPath = '/login';
          break;
        default:
          errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);

      if (shouldRedirect) {
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setPage(0); // Reset to first page when searching
      fetchUsers(0, rowsPerPage, searchQuery);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleRefresh = () => {
    fetchUsers(page, rowsPerPage, searchQuery);
  };

  const handleAddUser = () => {
    navigate('/admin/users/new');
  };

  const handleEditUser = (userId) => {
    navigate(`/admin/users/${userId}/edit`);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
    handleCloseMenu();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await apiService.admin.deleteUser(selectedUser.id);

      if (response?.data?.success) {
        // Remove user from the list
        setUsers(users.filter(user => user.id !== selectedUser.id));
        setTotalUsers(prev => prev - 1);
      } else {
        throw new Error(response?.data?.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'An error occurred while deleting the user');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleMenuOpen = (event, user) => {
    setActionMenuAnchor(event.currentTarget);
    setActiveMenuUser(user);
  };

  const handleCloseMenu = () => {
    setActionMenuAnchor(null);
    setActiveMenuUser(null);
  };

  const handleToggleUserStatus = async () => {
    if (!activeMenuUser) return;

    try {
      setLoading(true);
      const newStatus = !activeMenuUser.is_active;
      
      const response = await apiService.admin.updateUser(activeMenuUser.id, {
        isActive: newStatus
      });

      if (response?.data?.success) {
        // Update user in the list
        setUsers(users.map(user => 
          user.id === activeMenuUser.id ? { ...user, is_active: newStatus } : user
        ));
      } else {
        throw new Error(response?.data?.message || `Failed to ${newStatus ? 'activate' : 'deactivate'} user`);
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err.message || 'An error occurred while updating user status');
    } finally {
      setLoading(false);
      handleCloseMenu();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Users Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search users..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyPress={handleSearch}
            sx={{ mr: 2, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tests</TableCell>
                <TableCell>Avg. Score</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_admin ? 'Admin' : 'User'}
                        color={user.is_admin ? 'secondary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.total_tests || 0}</TableCell>
                    <TableCell>{user.avg_score ? `${user.avg_score}%` : 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleMenuOpen(e, user)}
                        aria-label="more actions"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          handleEditUser(activeMenuUser?.id);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        {activeMenuUser && (
          <MenuItem onClick={handleToggleUserStatus}>
            <ListItemIcon>
              {activeMenuUser.is_active ? <BlockIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>
              {activeMenuUser.is_active ? 'Deactivate' : 'Activate'}
            </ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleDeleteClick(activeMenuUser)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user 
            <strong>{selectedUser ? ` ${selectedUser.email}` : ''}</strong>? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UsersList;
