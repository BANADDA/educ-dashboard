import {
    Add,
    AdminPanelSettings,
    ErrorOutline,
    Refresh
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { auth, db } from "../firebase/firebaseConfig";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SuperAdminScreen = () => {
  const theme = useTheme();
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    errors: { displayName: '', email: '' }
  });

  useEffect(() => {
    const adminsRef = collection(db, "users");
    const q = query(adminsRef, where("role", "==", "admin"), where("isSuperAdmin", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const admins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSuperAdmins(admins);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching super admins:", error);
      setError("Failed to fetch super admins");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const validateForm = () => {
    const errors = {
      displayName: '',
      email: ''
    };
    let isValid = true;

    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
      isValid = false;
    } else if (formData.displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
      isValid = false;
    }

    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!EMAIL_REGEX.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }

    setFormData(prev => ({ ...prev, errors }));
    return isValid;
  };

  const handleCreateSuperAdmin = async () => {
    if (!validateForm()) return;

    try {
      const password = Array(16)
        .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*')
        .map(x => x[Math.floor(Math.random() * x.length)])
        .join('');

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);

      const newUserRef = doc(db, "users", userCredential.user.uid);
      await setDoc(newUserRef, {
        displayName: formData.displayName,
        email: formData.email,
        role: "admin",
        isSuperAdmin: true,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        status: 'active'
      });

      await sendPasswordResetEmail(auth, formData.email);

      setSnackbar({
        open: true,
        message: "Super Admin created successfully! Password reset email sent.",
        severity: 'success'
      });
      setOpenDialog(false);
      setFormData({ displayName: '', email: '', errors: { displayName: '', email: '' } });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handlePasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSnackbar({
        open: true,
        message: "Password reset email sent successfully",
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default
      }}>
        <Alert 
          severity="error"
          icon={<ErrorOutline />}
          sx={{ width: '100%', maxWidth: 500 }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: 4,
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default
    }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        <Card elevation={0} sx={{ mb: 4, backgroundColor: theme.palette.primary.main, color: 'white' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <AdminPanelSettings sx={{ fontSize: 40 }} />
              <Typography variant="h4" component="h1">
                Super Administrators
              </Typography>
            </Box>
            <Typography variant="subtitle1">
              Manage your organization's super administrators
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="All Super Administrators"
            action={
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenDialog(true)}
                sx={{ 
                  backgroundColor: theme.palette.success.main,
                  '&:hover': {
                    backgroundColor: theme.palette.success.dark
                  }
                }}
              >
                Add Super Admin
              </Button>
            }
          />
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {superAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.displayName}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        {admin.createdAt?.toDate().toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            px: 2,
                            py: 1,
                            borderRadius: '16px',
                            fontSize: '0.875rem',
                            backgroundColor: admin.status === 'active' 
                              ? theme.palette.success.light
                              : theme.palette.error.light,
                            color: admin.status === 'active'
                              ? theme.palette.success.dark
                              : theme.palette.error.dark
                          }}
                        >
                          {admin.status}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Reset Password">
                          <IconButton
                            onClick={() => handlePasswordReset(admin.email)}
                            color="primary"
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Dialog 
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add />
              Add New Super Administrator
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Display Name"
                fullWidth
                value={formData.displayName}
                onChange={(e) => setFormData({ 
                  ...formData,
                  displayName: e.target.value,
                  errors: { ...formData.errors, displayName: '' }
                })}
                error={!!formData.errors.displayName}
                helperText={formData.errors.displayName}
                required
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ 
                  ...formData,
                  email: e.target.value,
                  errors: { ...formData.errors, email: '' }
                })}
                error={!!formData.errors.email}
                helperText={formData.errors.email}
                required
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setOpenDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateSuperAdmin}
              disabled={!formData.displayName || !formData.email}
            >
              Create Super Admin
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            elevation={6}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default SuperAdminScreen;