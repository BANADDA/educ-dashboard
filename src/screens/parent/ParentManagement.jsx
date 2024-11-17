// src/components/ParentManagement.jsx

import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    ExpandLess,
    ExpandMore
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Snackbar,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import StudentManagement from '../../components/StudentManagement';
import { auth, db } from '../../firebase/firebaseConfig';

const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddParent, setOpenAddParent] = useState(false);
  const [newParent, setNewParent] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedParents, setExpandedParents] = useState({});
  const [editParent, setEditParent] = useState({ id: '', name: '', email: '' });
  const [openEditParent, setOpenEditParent] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const functions = getFunctions();

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'parent'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParents(parentsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching parents:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleOpenAddParent = () => {
    setNewParent({ name: '', email: '' });
    setOpenAddParent(true);
  };

  const handleCloseAddParent = () => {
    setOpenAddParent(false);
  };

  const handleAddParent = async () => {
    const { name, email } = newParent;

    if (!name || !email) {
      setSnackbar({ open: true, message: 'Please fill in all fields.', severity: 'warning' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the user in Firebase Authentication with a temporary password
      const userCredential = await createUserWithEmailAndPassword(auth, email, 'TemporaryPassword123!');

      const user = userCredential.user;

      // Update the user profile with the display name
      await updateProfile(user, { displayName: name });

      // Store parent details in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        role: 'parent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send password reset email
      await sendPasswordResetEmail(auth, email);

      setSnackbar({ open: true, message: 'Parent added successfully! A password reset email has been sent.', severity: 'success' });
      setOpenAddParent(false);
    } catch (error) {
      console.error('Error creating parent:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to create parent.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (parentId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // Editing Parent Functions
  const handleOpenEditParent = (parent) => {
    setEditParent({ id: parent.id, name: parent.name, email: parent.email });
    setOpenEditParent(true);
  };

  const handleCloseEditParent = () => {
    setOpenEditParent(false);
  };

  const handleEditParent = async () => {
    const { id, name, email } = editParent;

    if (!name || !email) {
      setSnackbar({ open: true, message: 'Please fill in all fields.', severity: 'warning' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update parent details in Firestore
      await updateDoc(doc(db, 'users', id), {
        name: name,
        email: email,
        updatedAt: serverTimestamp(),
      });

      setSnackbar({ open: true, message: 'Parent updated successfully.', severity: 'success' });
      setOpenEditParent(false);
    } catch (error) {
      console.error('Error updating parent:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to update parent.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deleting Parent Function
  const handleDeleteParent = async (parentId) => {
    if (!window.confirm('Are you sure you want to delete this parent? This will also remove all associated students.')) {
      return;
    }

    setIsSubmitting(true);

    try {
      const deleteParent = httpsCallable(functions, 'deleteParent');
      const result = await deleteParent({ parentId });
      console.log(result.data.message);
      setSnackbar({ open: true, message: result.data.message, severity: 'success' });
    } catch (error) {
      console.error('Error deleting parent:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to delete parent.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to send password reset email
  const handleSendResetEmail = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSnackbar({ open: true, message: 'Password reset email sent successfully.', severity: 'success' });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to send password reset email.', severity: 'error' });
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Parent Management
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleOpenAddParent}
        sx={{ mb: 4 }}
      >
        Add Parent
      </Button>

      {/* Parent List */}
      <Box>
        {loading ? (
          <CircularProgress />
        ) : parents.length === 0 ? (
          <Typography>No parents found.</Typography>
        ) : (
          parents.map((parent) => (
            <Card key={parent.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2 }}>
                      {parent.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{parent.name}</Typography>
                      <Typography color="textSecondary">{parent.email}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Tooltip title={expandedParents[parent.id] ? "Collapse" : "Expand"}>
                      <IconButton onClick={() => toggleExpand(parent.id)}>
                        {expandedParents[parent.id] ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Parent">
                      <IconButton onClick={() => handleOpenEditParent(parent)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Parent">
                      <IconButton onClick={() => handleDeleteParent(parent.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Send Password Reset Email">
                      <IconButton onClick={() => handleSendResetEmail(parent.email)}>
                        <EmailIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Expandable Student Management */}
                <Collapse in={expandedParents[parent.id]} timeout="auto" unmountOnExit>
                  <Divider sx={{ my: 2 }} />
                  <StudentManagement parentId={parent.id} />
                </Collapse>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Add Parent Dialog */}
      <Dialog open={openAddParent} onClose={() => !isSubmitting && handleCloseAddParent()} fullWidth maxWidth="sm">
        <DialogTitle>Add New Parent</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Parent Name"
            type="text"
            fullWidth
            value={newParent.name}
            onChange={(e) => setNewParent({ ...newParent, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Parent Email"
            type="email"
            fullWidth
            value={newParent.email}
            onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !isSubmitting && handleCloseAddParent()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAddParent} color="primary" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Add Parent'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Parent Dialog */}
      <Dialog open={openEditParent} onClose={() => !isSubmitting && handleCloseEditParent()} fullWidth maxWidth="sm">
        <DialogTitle>Edit Parent</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Parent Name"
            type="text"
            fullWidth
            value={editParent.name}
            onChange={(e) => setEditParent({ ...editParent, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Parent Email"
            type="email"
            fullWidth
            value={editParent.email}
            onChange={(e) => setEditParent({ ...editParent, email: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !isSubmitting && handleCloseEditParent()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleEditParent} color="primary" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParentManagement;
