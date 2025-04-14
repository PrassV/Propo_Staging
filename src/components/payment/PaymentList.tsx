import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Visibility as VisibilityIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { 
  getPayments, 
  createPaymentRequest, 
  recordManualPayment, 
  sendPaymentReminder 
} from '../../api/services/paymentService';
import { getProperties } from '../../api/services/propertyService';
import { getTenants } from '../../api/services/tenantService';

// Define types
interface Payment {
  id: string;
  amount: number;
  amount_paid: number;
  due_date: string;
  payment_date?: string;
  status: string;
  payment_type: string;
  payment_method?: string;
  description: string;
  property_id: string;
  tenant_id: string;
  created_at: string;
  property_details?: {
    property_name: string;
  };
  tenant_details?: {
    name: string;
    email: string;
  };
}

interface Property {
  id: string;
  property_name: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
}

interface PaymentFormData {
  property_id: string;
  tenant_id: string;
  amount: number;
  due_date: Date | null;
  payment_type: string;
  description: string;
}

interface RecordPaymentFormData {
  amount_paid: number;
  payment_date: Date | null;
  payment_method: string;
  notes: string;
}

interface ReminderFormData {
  recipient_email: string;
  message: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PaymentList: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState<boolean>(false);
  const [openRecordDialog, setOpenRecordDialog] = useState<boolean>(false);
  const [openReminderDialog, setOpenReminderDialog] = useState<boolean>(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Form data
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    property_id: '',
    tenant_id: '',
    amount: 0,
    due_date: null,
    payment_type: 'rent',
    description: ''
  });
  
  const [recordFormData, setRecordFormData] = useState<RecordPaymentFormData>({
    amount_paid: 0,
    payment_date: new Date(),
    payment_method: 'cash',
    notes: ''
  });
  
  const [reminderFormData, setReminderFormData] = useState<ReminderFormData>({
    recipient_email: '',
    message: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchProperties();
    fetchTenants();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await getPayments();
      setPayments(response.items || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      enqueueSnackbar('Failed to load payments', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await getProperties();
      setProperties(response.items || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      enqueueSnackbar('Failed to load properties', { variant: 'error' });
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await getTenants();
      setTenants(response.items || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      enqueueSnackbar('Failed to load tenants', { variant: 'error' });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Create Payment Dialog
  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setPaymentFormData({
      property_id: '',
      tenant_id: '',
      amount: 0,
      due_date: null,
      payment_type: 'rent',
      description: ''
    });
  };

  // Record Payment Dialog
  const handleOpenRecordDialog = (payment: Payment) => {
    setSelectedPaymentId(payment.id);
    setSelectedPayment(payment);
    setRecordFormData({
      amount_paid: payment.amount - (payment.amount_paid || 0),
      payment_date: new Date(),
      payment_method: 'cash',
      notes: ''
    });
    setOpenRecordDialog(true);
  };

  const handleCloseRecordDialog = () => {
    setOpenRecordDialog(false);
    setSelectedPaymentId('');
    setSelectedPayment(null);
  };

  // Reminder Dialog
  const handleOpenReminderDialog = (payment: Payment) => {
    setSelectedPaymentId(payment.id);
    setSelectedPayment(payment);
    setReminderFormData({
      recipient_email: payment.tenant_details?.email || '',
      message: `This is a reminder that your payment of $${payment.amount} is due on ${format(new Date(payment.due_date), 'MMMM dd, yyyy')}. Please make your payment as soon as possible.`
    });
    setOpenReminderDialog(true);
  };

  const handleCloseReminderDialog = () => {
    setOpenReminderDialog(false);
    setSelectedPaymentId('');
    setSelectedPayment(null);
  };

  // Form Input Handlers
  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setPaymentFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setPaymentFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleRecordInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setRecordFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRecordDateChange = (date: Date | null) => {
    setRecordFormData(prev => ({ ...prev, payment_date: date }));
  };

  const handleReminderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReminderFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Handlers
  const handleCreatePayment = async () => {
    try {
      if (!paymentFormData.property_id || !paymentFormData.tenant_id || !paymentFormData.amount || !paymentFormData.due_date) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
        return;
      }

      const paymentData = {
        ...paymentFormData,
        due_date: paymentFormData.due_date.toISOString().split('T')[0]
      };

      await createPaymentRequest(paymentData);
      enqueueSnackbar('Payment request created successfully', { variant: 'success' });
      handleCloseCreateDialog();
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment request:', error);
      enqueueSnackbar('Failed to create payment request', { variant: 'error' });
    }
  };

  const handleRecordPayment = async () => {
    try {
      if (!selectedPaymentId || !recordFormData.amount_paid || !recordFormData.payment_date) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
        return;
      }

      const recordData = {
        ...recordFormData,
        payment_date: recordFormData.payment_date.toISOString().split('T')[0]
      };

      await recordManualPayment(selectedPaymentId, recordData);
      enqueueSnackbar('Payment recorded successfully', { variant: 'success' });
      handleCloseRecordDialog();
      fetchPayments();
    } catch (error) {
      console.error('Error recording payment:', error);
      enqueueSnackbar('Failed to record payment', { variant: 'error' });
    }
  };

  const handleSendReminder = async () => {
    try {
      if (!selectedPaymentId || !reminderFormData.recipient_email || !reminderFormData.message) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
        return;
      }

      await sendPaymentReminder(selectedPaymentId, reminderFormData);
      enqueueSnackbar('Payment reminder sent successfully', { variant: 'success' });
      handleCloseReminderDialog();
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      enqueueSnackbar('Failed to send payment reminder', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'partially_paid':
        return 'info';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'rent':
        return 'Rent';
      case 'deposit':
        return 'Security Deposit';
      case 'fee':
        return 'Fee';
      case 'utility':
        return 'Utility';
      case 'maintenance':
        return 'Maintenance';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const filterPaymentsByStatus = (status: string | string[]) => {
    if (Array.isArray(status)) {
      return payments.filter(payment => status.includes(payment.status.toLowerCase()));
    }
    return payments.filter(payment => payment.status.toLowerCase() === status);
  };

  const isPastDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Payments
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Create Payment Request
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="payment tabs">
          <Tab label="All Payments" />
          <Tab label="Pending" />
          <Tab label="Paid" />
          <Tab label="Overdue" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderPaymentTable(payments)}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {renderPaymentTable(filterPaymentsByStatus(['pending', 'partially_paid']))}
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        {renderPaymentTable(filterPaymentsByStatus('paid'))}
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        {renderPaymentTable(filterPaymentsByStatus('overdue'))}
      </TabPanel>

      {/* Create Payment Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Payment Request</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Property</InputLabel>
                  <Select
                    value={paymentFormData.property_id}
                    onChange={handlePaymentInputChange}
                    name="property_id"
                    label="Property"
                    required
                  >
                    {properties.map((property) => (
                      <MenuItem key={property.id} value={property.id}>
                        {property.property_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tenant</InputLabel>
                  <Select
                    value={paymentFormData.tenant_id}
                    onChange={handlePaymentInputChange}
                    name="tenant_id"
                    label="Tenant"
                    required
                  >
                    {tenants.map((tenant) => (
                      <MenuItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={paymentFormData.amount}
                  onChange={handlePaymentInputChange}
                  InputProps={{ startAdornment: '$' }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Due Date"
                  value={paymentFormData.due_date}
                  onChange={(date) => handleDateChange('due_date', date)}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Type</InputLabel>
                  <Select
                    value={paymentFormData.payment_type}
                    onChange={handlePaymentInputChange}
                    name="payment_type"
                    label="Payment Type"
                    required
                  >
                    <MenuItem value="rent">Rent</MenuItem>
                    <MenuItem value="deposit">Security Deposit</MenuItem>
                    <MenuItem value="fee">Fee</MenuItem>
                    <MenuItem value="utility">Utility</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={paymentFormData.description}
                  onChange={handlePaymentInputChange}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button onClick={handleCreatePayment} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={openRecordDialog} onClose={handleCloseRecordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {selectedPayment && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1">
                    Recording payment for: {selectedPayment.tenant_details?.name}
                  </Typography>
                  <Typography variant="body2">
                    Total Amount: ${selectedPayment.amount}
                  </Typography>
                  <Typography variant="body2">
                    Amount Paid: ${selectedPayment.amount_paid || 0}
                  </Typography>
                  <Typography variant="body2">
                    Remaining: ${selectedPayment.amount - (selectedPayment.amount_paid || 0)}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Amount Paid"
                  name="amount_paid"
                  type="number"
                  value={recordFormData.amount_paid}
                  onChange={handleRecordInputChange}
                  InputProps={{ startAdornment: '$' }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <DatePicker
                  label="Payment Date"
                  value={recordFormData.payment_date}
                  onChange={handleRecordDateChange}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={recordFormData.payment_method}
                    onChange={handleRecordInputChange}
                    name="payment_method"
                    label="Payment Method"
                    required
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="check">Check</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={recordFormData.notes}
                  onChange={handleRecordInputChange}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecordDialog}>Cancel</Button>
          <Button onClick={handleRecordPayment} variant="contained" color="primary">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={openReminderDialog} onClose={handleCloseReminderDialog} maxWidth="md" fullWidth>
        <DialogTitle>Send Payment Reminder</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {selectedPayment && (
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  Sending reminder for: {selectedPayment.tenant_details?.name}
                </Typography>
                <Typography variant="body2">
                  Amount Due: ${selectedPayment.amount - (selectedPayment.amount_paid || 0)}
                </Typography>
                <Typography variant="body2">
                  Due Date: {format(new Date(selectedPayment.due_date), 'MMMM dd, yyyy')}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipient Email"
                name="recipient_email"
                value={reminderFormData.recipient_email}
                onChange={handleReminderInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                name="message"
                value={reminderFormData.message}
                onChange={handleReminderInputChange}
                multiline
                rows={4}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReminderDialog}>Cancel</Button>
          <Button onClick={handleSendReminder} variant="contained" color="primary">
            Send Reminder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  function renderPaymentTable(paymentsToShow: Payment[]) {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tenant</TableCell>
              <TableCell>Property</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentsToShow.length > 0 ? (
              paymentsToShow.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.tenant_details?.name || 'Unknown'}</TableCell>
                  <TableCell>{payment.property_details?.property_name || 'Unknown'}</TableCell>
                  <TableCell>{getPaymentTypeLabel(payment.payment_type)}</TableCell>
                  <TableCell>
                    ${payment.amount.toFixed(2)}
                    {payment.amount_paid > 0 && (
                      <Typography variant="caption" display="block">
                        Paid: ${payment.amount_paid.toFixed(2)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(payment.due_date), 'MMM dd, yyyy')}
                    {payment.status !== 'paid' && isPastDue(payment.due_date) && (
                      <Typography variant="caption" color="error" display="block">
                        Past Due
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={payment.status.replace('_', ' ')} 
                      color={getStatusColor(payment.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {payment.status !== 'paid' && (
                      <Tooltip title="Record Payment">
                        <IconButton onClick={() => handleOpenRecordDialog(payment)}>
                          <ReceiptIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(payment.status === 'pending' || payment.status === 'partially_paid' || payment.status === 'overdue') && (
                      <Tooltip title="Send Reminder">
                        <IconButton onClick={() => handleOpenReminderDialog(payment)}>
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No payments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
};

export default PaymentList;
