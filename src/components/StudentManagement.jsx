import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ExpandLess,
    ExpandMore,
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, secondaryAuth } from '../firebase/firebaseConfig';

const StudentManagement = ({ parentId }) => {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [openAddStudent, setOpenAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    password: '',
    schoolId: '',
    levelId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState({});
  const [editStudent, setEditStudent] = useState({
    id: '',
    name: '',
    password: '',
    schoolId: '',
    levelId: '',
  });
  const [openEditStudent, setOpenEditStudent] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [schools, setSchools] = useState([]);
  const [allLevels, setAllLevels] = useState([]); // Prefetch all levels
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Fetch Students in Real-Time
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'), where('parentId', '==', parentId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const studentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStudents(studentsData);
        setLoadingStudents(false);
      },
      (error) => {
        console.error('Error fetching students:', error);
        setLoadingStudents(false);
        setSnackbar({ open: true, message: 'Failed to fetch students.', severity: 'error' });
      }
    );

    return () => unsubscribe();
  }, [parentId]);

  // Fetch Schools on Mount
  useEffect(() => {
    const fetchSchools = async () => {
      setLoadingSchools(true);
      try {
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schoolsData = schoolsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSchools(schoolsData);
      } catch (error) {
        console.error('Error fetching schools:', error);
        setSnackbar({ open: true, message: 'Failed to fetch schools.', severity: 'error' });
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  // Prefetch All Levels
  useEffect(() => {
    const fetchAllLevels = async () => {
      try {
        const levelsSnapshot = await getDocs(collection(db, 'levels'));
        const levelsData = levelsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllLevels(levelsData);
      } catch (error) {
        console.error('Error fetching levels:', error);
        setSnackbar({ open: true, message: 'Failed to fetch levels.', severity: 'error' });
      }
    };

    fetchAllLevels();
  }, []);

  // Handle Opening Add Student Dialog
  const handleOpenAddStudent = () => {
    setNewStudent({ name: '', password: '', schoolId: '', levelId: '' });
    setOpenAddStudent(true);
  };

  const handleCloseAddStudent = () => {
    setOpenAddStudent(false);
  };

  // Function to Generate Unique Email
  const generateUniqueEmail = (name) => {
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '.');
    const uniqueSuffix = Date.now();
    return `${sanitizedName}.${uniqueSuffix}@school.com`;
  };

  // Handle Adding a New Student
  const handleAddStudent = async () => {
    const { name, password, schoolId, levelId } = newStudent;
  
    if (!name || !password || !schoolId || !levelId) {
      setSnackbar({ open: true, message: 'Please fill in all fields.', severity: 'warning' });
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      const generatedEmail = generateUniqueEmail(name);
  
      // Use secondaryAuth to create the student user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, generatedEmail, password);
      const user = userCredential.user;
  
      await updateProfile(user, { displayName: name });
  
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email: generatedEmail,
        role: 'student',
        parentId,
        schoolId,
        levelId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  
      setSnackbar({ open: true, message: 'Student added successfully.', severity: 'success' });
      setOpenAddStudent(false);
    } catch (error) {
      console.error('Error adding student:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to add student.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };  

  // Handle Opening Edit Student Dialog
  const handleOpenEditStudent = (student) => {
    setEditStudent({
      id: student.id,
      name: student.name,
      password: '',
      schoolId: student.schoolId,
      levelId: student.levelId,
    });
    setOpenEditStudent(true);
  };

  const handleCloseEditStudent = () => {
    setOpenEditStudent(false);
  };

  // Handle Editing a Student
  const handleEditStudentSubmit = async () => {
    const { id, name, schoolId, levelId } = editStudent;

    if (!name || !schoolId || !levelId) {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'warning' });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateDoc(doc(db, 'users', id), {
        name,
        schoolId,
        levelId,
        updatedAt: serverTimestamp(),
      });

      setSnackbar({ open: true, message: 'Student updated successfully.', severity: 'success' });
      setOpenEditStudent(false);
    } catch (error) {
      console.error('Error updating student:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to update student.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to delete a student
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Permanently delete the document
      await deleteDoc(doc(db, 'users', studentId));
  
      setSnackbar({
        open: true,
        message: 'Student deleted successfully.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete student.',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };    

  // Toggle Expand for Student Details
  const toggleExpandStudent = (studentId) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  return (
    <Box mt={2}>
      <Typography variant="h5" gutterBottom>
        Students
      </Typography>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<AddIcon />}
        onClick={handleOpenAddStudent}
        sx={{ mb: 2 }}
        disabled={isSubmitting}
      >
        Add Student
      </Button>

      {/* Students List */}
      <Box>
        {loadingStudents ? (
          <CircularProgress />
        ) : students.length === 0 ? (
          <Typography>No students found for this parent.</Typography>
        ) : (
          students.map((student) => (
            <Card key={student.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2 }}>{student.name.charAt(0).toUpperCase()}</Avatar>
                    <Box>
                      <Typography variant="h6">{student.name}</Typography>
                      <Typography variant="body2">
                        School: {schools.find((school) => school.id === student.schoolId)?.name || 'Unknown School'}
                      </Typography>
                      <Typography variant="body2">
                        Level: {allLevels.find((level) => level.id === student.levelId)?.name || 'Unknown Level'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Tooltip title={expandedStudents[student.id] ? 'Collapse' : 'Expand'}>
                      <IconButton onClick={() => toggleExpandStudent(student.id)}>
                        {expandedStudents[student.id] ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Student">
                      <IconButton onClick={() => handleOpenEditStudent(student)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Student">
                      <IconButton
                        onClick={() => handleDeleteStudent(student.id)} // Add your delete logic here
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Add Student Dialog */}
      <Dialog open={openAddStudent} onClose={handleCloseAddStudent} fullWidth maxWidth="sm">
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Student Name"
            type="text"
            fullWidth
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={newStudent.password}
            onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
            helperText="Set a password for the student."
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Select School</InputLabel>
            <Select
              value={newStudent.schoolId}
              onChange={(e) => setNewStudent({ ...newStudent, schoolId: e.target.value })}
            >
              {schools.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Select Level</InputLabel>
            <Select
              value={newStudent.levelId}
              onChange={(e) => setNewStudent({ ...newStudent, levelId: e.target.value })}
            >
              {allLevels
                .filter((level) => level.schoolId === newStudent.schoolId)
                .map((level) => (
                  <MenuItem key={level.id} value={level.id}>
                    {level.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddStudent} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAddStudent} color="primary" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Add Student'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={openEditStudent} onClose={handleCloseEditStudent} fullWidth maxWidth="sm">
        <DialogTitle>Edit Student</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Student Name"
            type="text"
            fullWidth
            value={editStudent.name}
            onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Select School</InputLabel>
            <Select
              value={editStudent.schoolId}
              onChange={(e) => setEditStudent({ ...editStudent, schoolId: e.target.value })}
            >
              {schools.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Select Level</InputLabel>
            <Select
              value={editStudent.levelId}
              onChange={(e) => setEditStudent({ ...editStudent, levelId: e.target.value })}
            >
              {allLevels
                .filter((level) => level.schoolId === editStudent.schoolId)
                .map((level) => (
                  <MenuItem key={level.id} value={level.id}>
                    {level.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditStudent} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleEditStudentSubmit} color="primary" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentManagement;
