import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Chip, 
  Button, 
  Divider, 
  TextField, 
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Home as HomeIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

import { 
  getMaintenanceRequest, 
  updateMaintenanceRequest, 
  addMaintenanceComment 
} from '../../api/services/maintenanceService';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  property_id: string;
  unit_number?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_to?: string;
  estimated_cost?: number;
  actual_cost?: number;
  scheduled_date?: string;
  completed_date?: string;
  property_details?: {
    property_name: string;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
  };
  tenant_details?: {
    name: string;
    email: string;
    phone: string;
  };
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    created_by: string;
    user_name?: string;
  }>;
  attachments?: Array<{
    id: string;
    file_url: string;
    file_name: string;
    created_at: string;
  }>;
}

interface CommentFormData {
  content: string;
}

interface UpdateFormData {
  status: string;
  priority: string;
  assigned_to?: string;
  estimated_cost?: number;
  actual_cost?: number;
  scheduled_date?: string;
}

const MaintenanceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [maintenanceRequest, setMaintenanceRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [commentFormData, setCommentFormData] = useState<CommentFormData>({ content: '' });
  const [updateFormData, setUpdateFormData] = useState<UpdateFormData>({
    status: '',
    priority: '',
    assigned_to: '',
    estimated_cost: undefined,
    actual_cost: undefined,
    scheduled_date: undefined
  });
  const [openUpdateDialog, setOpenUpdateDialog] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchMaintenanceRequest();
    }
  }, [id]);

  useEffect(() => {
    if (maintenanceRequest) {
      setUpdateFormData({
        status: maintenanceRequest.status,
        priority: maintenanceRequest.priority,
        assigned_to: maintenanceRequest.assigned_to || '',
        estimated_cost: maintenanceRequest.estimated_cost,
        actual_cost: maintenanceRequest.actual_cost,
        scheduled_date: maintenanceRequest.scheduled_date
      });
    }
  }, [maintenanceRequest]);

  const fetchMaintenanceRequest = async () => {
    try {
      setLoading(true);
      if (!id) return;
      
      const response = await getMaintenanceRequest(id);
      setMaintenanceRequest(response.request);
    } catch (error) {
      console.error('Error fetching maintenance request:', error);
      enqueueSnackbar('Failed to load maintenance request details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommentFormData({ content: e.target.value });
  };

  const handleAddComment = async () => {
    try {
      if (!id || !commentFormData.content.trim()) return;
      
      await addMaintenanceComment(id, commentFormData.content);
      enqueueSnackbar('Comment added successfully', { variant: 'success' });
      setCommentFormData({ content: '' });
      fetchMaintenanceRequest();
    } catch (error) {
      console.error('Error adding comment:', error);
      enqueueSnackbar('Failed to add comment', { variant: 'error' });
    }
  };

  const handleOpenUpdateDialog = () => {
    setOpenUpdateDialog(true);
  };

  const handleCloseUpdateDialog = () => {
    setOpenUpdateDialog(false);
  };

  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setUpdateFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateRequest = async () => {
    try {
      if (!id) return;
      
      await updateMaintenanceRequest(id, updateFormData);
      enqueueSnackbar('Maintenance request updated successfully', { variant: 'success' });
      handleCloseUpdateDialog();
      fetchMaintenanceRequest();
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      enqueueSnackbar('Failed to update maintenance request', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'emergency':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!maintenanceRequest) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Maintenance request not found
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mr: 2 }}>
          Back
        </Button>
        <Typography variant="h5" component="h1">
          Maintenance Request Details
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{maintenanceRequest.title}</Typography>
              <Box>
                <Chip 
                  label={maintenanceRequest.status.replace('_', ' ')} 
                  color={getStatusColor(maintenanceRequest.status) as any}
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label={maintenanceRequest.priority} 
                  color={getPriorityColor(maintenanceRequest.priority) as any}
                />
              </Box>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              {maintenanceRequest.description}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Category</Typography>
                <Typography variant="body2">{maintenanceRequest.category.replace('_', ' ')}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Created</Typography>
                <Typography variant="body2">
                  {format(new Date(maintenanceRequest.created_at), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Grid>
              {maintenanceRequest.scheduled_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Scheduled Date</Typography>
                  <Typography variant="body2">
                    {format(new Date(maintenanceRequest.scheduled_date), 'MMM dd, yyyy')}
                  </Typography>
                </Grid>
              )}
              {maintenanceRequest.completed_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Completed Date</Typography>
                  <Typography variant="body2">
                    {format(new Date(maintenanceRequest.completed_date), 'MMM dd, yyyy')}
                  </Typography>
                </Grid>
              )}
              {maintenanceRequest.estimated_cost !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Estimated Cost</Typography>
                  <Typography variant="body2">${maintenanceRequest.estimated_cost.toFixed(2)}</Typography>
                </Grid>
              )}
              {maintenanceRequest.actual_cost !== undefined && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Actual Cost</Typography>
                  <Typography variant="body2">${maintenanceRequest.actual_cost.toFixed(2)}</Typography>
                </Grid>
              )}
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleOpenUpdateDialog}
              >
                Update Request
              </Button>
            </Box>
          </Paper>

          {/* Comments Section */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Comments
            </Typography>
            
            {maintenanceRequest.comments && maintenanceRequest.comments.length > 0 ? (
              <List>
                {maintenanceRequest.comments.map((comment) => (
                  <ListItem key={comment.id} alignItems="flex-start" divider>
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={comment.user_name || 'User'}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {comment.content}
                          </Typography>
                          <Typography component="span" variant="caption" display="block" sx={{ mt: 1 }}>
                            {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No comments yet
              </Typography>
            )}
            
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Add a comment"
                multiline
                rows={3}
                value={commentFormData.content}
                onChange={handleCommentChange}
                sx={{ mb: 2 }}
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAddComment}
                disabled={!commentFormData.content.trim()}
              >
                Add Comment
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Property Information */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Property Information" 
              avatar={<HomeIcon />}
            />
            <CardContent>
              <Typography variant="subtitle1">
                {maintenanceRequest.property_details?.property_name || 'Unknown Property'}
              </Typography>
              <Typography variant="body2">
                {maintenanceRequest.property_details?.address_line1}
              </Typography>
              <Typography variant="body2">
                {maintenanceRequest.property_details?.city}, {maintenanceRequest.property_details?.state} {maintenanceRequest.property_details?.zip_code}
              </Typography>
              {maintenanceRequest.unit_number && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Unit:</strong> {maintenanceRequest.unit_number}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Tenant Information (if available) */}
          {maintenanceRequest.tenant_details && (
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Tenant Information" 
                avatar={<PersonIcon />}
              />
              <CardContent>
                <Typography variant="subtitle1">
                  {maintenanceRequest.tenant_details.name}
                </Typography>
                <Typography variant="body2">
                  {maintenanceRequest.tenant_details.email}
                </Typography>
                <Typography variant="body2">
                  {maintenanceRequest.tenant_details.phone}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Attachments (if available) */}
          {maintenanceRequest.attachments && maintenanceRequest.attachments.length > 0 && (
            <Card>
              <CardHeader 
                title="Attachments" 
                avatar={<AttachFileIcon />}
              />
              <CardContent>
                <List>
                  {maintenanceRequest.attachments.map((attachment) => (
                    <ListItem key={attachment.id} button component="a" href={attachment.file_url} target="_blank">
                      <ListItemText
                        primary={attachment.file_name}
                        secondary={format(new Date(attachment.created_at), 'MMM dd, yyyy')}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Update Request Dialog */}
      <Dialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Update Maintenance Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={updateFormData.status}
                  onChange={handleUpdateChange}
                  name="status"
                  label="Status"
                >
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={updateFormData.priority}
                  onChange={handleUpdateChange}
                  name="priority"
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Assigned To"
                name="assigned_to"
                value={updateFormData.assigned_to || ''}
                onChange={handleUpdateChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Scheduled Date"
                name="scheduled_date"
                type="date"
                value={updateFormData.scheduled_date || ''}
                onChange={handleUpdateChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Cost"
                name="estimated_cost"
                type="number"
                value={updateFormData.estimated_cost || ''}
                onChange={handleUpdateChange}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Actual Cost"
                name="actual_cost"
                type="number"
                value={updateFormData.actual_cost || ''}
                onChange={handleUpdateChange}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpdateDialog}>Cancel</Button>
          <Button onClick={handleUpdateRequest} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceDetails;
