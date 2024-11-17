// teachers.jsx

import {
    Add,
    ArrowBack,
    Book,
    ChevronRight,
    Close,
    Groups,
    MoreVert,
    Search
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import {
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from "../../firebase/firebaseConfig";

// Utility function to get initials from a name
const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('');
};

// Utility function to get teacher summary
const getTeacherSummary = (teacher) => {
    const classCount = Array.isArray(teacher.classes) ? teacher.classes.length : 0;
    const subjectCount = Array.isArray(teacher.classes) && typeof teacher.subjects === 'object'
        ? Object.values(teacher.subjects).reduce((acc, subjects) => acc + (subjects?.length || 0), 0)
        : 0;
    return { classCount, subjectCount };
};

// AddTeacherDialog.jsx

const AddTeacherDialog = ({ open, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        gender: "",
        dateOfBirth: "",
        phone: "",
        address: "",
        schoolId: "",
    });
    const [schools, setSchools] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Fetch schools from Firestore
    useEffect(() => {
        let unsubscribe;
        try {
            const schoolsRef = collection(db, "schools");

            const fetchSchools = async () => {
                const querySnapshot = await getDocs(schoolsRef);
                if (querySnapshot.empty) setError("No schools found in database");
                else {
                    setSchools(querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })));
                }
            };

            fetchSchools();

            // Real-time listener
            unsubscribe = onSnapshot(
                schoolsRef,
                (snapshot) => {
                    setSchools(snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })));
                },
                (error) => setError(error.message)
            );
        } catch (error) {
            setError(error.message);
        }

        // Cleanup listener on component unmount
        return () => unsubscribe && unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!formData.schoolId) {
            setSnackbar({ open: true, message: "Please select a school!", severity: 'warning' });
            return;
        }

        if (!formData.email) {
            setSnackbar({ open: true, message: "Please provide an email address!", severity: 'warning' });
            return;
        }

        setIsSubmitting(true);

        try {
            // Check if user is authenticated
            if (!auth.currentUser) {
                throw new Error("No authenticated user found");
            }

            // Reference to current user (admin) document
            const currentUserRef = doc(db, "users", auth.currentUser.uid);

            let userData;
            try {
                const currentUserSnap = await getDoc(currentUserRef);

                if (!currentUserSnap.exists()) {
                    // Create admin document if it doesn't exist
                    const adminData = {
                        email: auth.currentUser.email,
                        role: 'admin',
                        createdAt: serverTimestamp(),
                        lastUpdated: serverTimestamp(),
                        status: 'active',
                        uid: auth.currentUser.uid
                    };

                    await setDoc(currentUserRef, adminData);
                    userData = adminData;
                } else {
                    userData = currentUserSnap.data();
                }
            } catch (firestoreError) {
                throw firestoreError;
            }

            if (userData.role !== 'admin') {
                throw new Error("Insufficient permissions - admin access required");
            }

            // Generate random password
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
            const generatedPassword = Array(12)
                .fill(0)
                .map(() => chars[Math.floor(Math.random() * chars.length)])
                .join('');

            // Create new user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                generatedPassword
            );

            // Prepare user data
            const newUserData = {
                ...formData,
                email: formData.email,
                role: "staff", // or "tutor" based on your logic
                isSuperAdmin: false,
                classes: [], // Initialize as empty array
                subjects: {}, // Initialize as empty object to prevent undefined errors
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser.uid,
                lastUpdated: serverTimestamp(),
                status: 'active',
                uid: userCredential.user.uid
            };

            // Save to Firestore
            const newUserRef = doc(db, "users", userCredential.user.uid);
            await setDoc(newUserRef, newUserData);

            // Send password reset email
            await sendPasswordResetEmail(auth, formData.email);

            setSnackbar({ open: true, message: "Teacher added successfully! A password reset email has been sent.", severity: 'success' });
            onAdd && onAdd(newUserData);
            onClose();

        } catch (error) {
            const errorMessages = {
                'auth/email-already-in-use': 'This email address is already in use.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/weak-password': 'The password provided is too weak.',
                'permission-denied': 'You do not have permission to add teachers.',
                'not-found': 'User profile not found. Please try logging in again.',
                'not-authenticated': 'Please log in to perform this action.',
                'invalid-argument': 'Database error. Please try again.'
            };

            const message = errorMessages[error.code] || error.message || 'An unexpected error occurred.';
            setSnackbar({ open: true, message, severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Teacher</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            label="Full Name"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Gender</InputLabel>
                            <Select
                                value={formData.gender}
                                label="Gender"
                                onChange={(e) =>
                                    setFormData({ ...formData, gender: e.target.value })
                                }
                            >
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Date of Birth"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.dateOfBirth}
                            onChange={(e) =>
                                setFormData({ ...formData, dateOfBirth: e.target.value })
                            }
                        />
                        <TextField
                            label="Phone"
                            fullWidth
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                        />
                        <TextField
                            label="Address"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                        />
                        <FormControl fullWidth>
                            <InputLabel>School</InputLabel>
                            <Select
                                value={formData.schoolId}
                                label="School"
                                onChange={(e) =>
                                    setFormData({ ...formData, schoolId: e.target.value })
                                }
                            >
                                {schools.map((school) => (
                                    <MenuItem key={school.id} value={school.id}>
                                        {school.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={
                            isSubmitting ||
                            !formData.name ||
                            !formData.gender ||
                            !formData.email ||
                            !formData.schoolId
                        }
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Add Teacher"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
   ) };

// AssignClassDialog.jsx

const AssignClassDialog = ({ open, onClose, teacher, onAssign, levelsData }) => {
    const [selectedLevel, setSelectedLevel] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Reset selection when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setSelectedLevel('');
        }
    }, [open]);

    // Proceed only if teacher and teacher.schoolId exist
    if (!teacher?.schoolId) {
        return null; // Or display a message indicating the issue
    }

    // Ensure classes is an array
    const teacherClasses = Array.isArray(teacher.classes) ? teacher.classes : [];

    // Filter levels belonging to the teacher's school and not already assigned
    const availableLevels = levelsData.filter(level =>
        level.schoolId === teacher.schoolId && !teacherClasses.includes(level.id)
    );

    const handleSubmit = async () => {
        if (selectedLevel) {
            try {
                await onAssign(teacher.id, selectedLevel);
                setSnackbar({ open: true, message: "Level assigned successfully.", severity: 'success' });
                onClose();
            } catch (error) {
                setSnackbar({ open: true, message: "Failed to assign level. Please try again.", severity: 'error' });
            }
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Level to {teacher?.name}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Level</InputLabel>
                        <Select
                            value={selectedLevel}
                            label="Level"
                            onChange={(e) => setSelectedLevel(e.target.value)}
                        >
                            {availableLevels.map((level) => (
                                <MenuItem key={level.id} value={level.id}>
                                    {level.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={false}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!selectedLevel}
                    >
                        Assign Level
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    )};

// AssignSubjectDialog.jsx

const AssignSubjectDialog = ({ open, onClose, teacher, levelId, onAssign, subjectsData }) => {
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Reset selection when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setSelectedSubjects([]);
        }
    }, [open]);

    // Proceed only if teacher and teacher.schoolId exist
    if (!teacher?.schoolId) {
        return null; // Or display a message indicating the issue
    }

    // Filter subjects belonging to the specified level and school
    const availableSubjects = subjectsData.filter(subject =>
        subject.levelId === levelId && subject.schoolId === teacher.schoolId
    );

    const handleSubmit = async () => {
        if (selectedSubjects.length > 0) {
            try {
                await onAssign(teacher.id, levelId, selectedSubjects);
                setSnackbar({ open: true, message: "Subjects assigned successfully.", severity: 'success' });
                onClose();
            } catch (error) {
                setSnackbar({ open: true, message: "Failed to assign subjects. Please try again.", severity: 'error' });
            }
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Subjects for Level {levelId}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Subjects</InputLabel>
                        <Select
                            multiple
                            value={selectedSubjects}
                            label="Subjects"
                            onChange={(e) => setSelectedSubjects(e.target.value)}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={availableSubjects.find(s => s.id === value)?.name || value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            {availableSubjects.map((subject) => (
                                <MenuItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={false}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={selectedSubjects.length === 0}
                    >
                        Assign Subjects
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
   ) };

// TeacherDetailsView.jsx

const TeacherDetailsView = ({ teacher, open, onClose, levelsData, subjectsData }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    if (!teacher) return null;

    const { classCount, subjectCount } = getTeacherSummary(teacher);

    // Get level details
    const assignedLevels = Array.isArray(teacher.classes)
        ? levelsData.filter(level => teacher.classes.includes(level.id))
        : [];

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen={fullScreen}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={onClose}
                        sx={{ color: 'text.secondary' }}
                    >
                        Back
                    </Button>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    {/* Profile Header */}
                    <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                bgcolor: 'primary.light',
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 600
                            }}
                        >
                            {getInitials(teacher.name)}
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight={600}>
                                {teacher.name}
                            </Typography>
                            <Typography color="text.secondary">
                                Teacher ID: {teacher.id}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Personal Information */}
                    <Typography variant="h6" gutterBottom>
                        Personal Information
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {[
                            { label: "Gender", value: teacher.gender },
                            { label: "Date of Birth", value: teacher.dateOfBirth },
                            { label: "Phone", value: teacher.phone },
                            { label: "Address", value: teacher.address }
                        ].map((item, idx) => (
                            <Grid item xs={12} sm={6} key={idx}>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography color="text.secondary" variant="body2" gutterBottom>
                                        {item.label}
                                    </Typography>
                                    <Typography>{item.value}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Teaching Schedule */}
                    <Typography variant="h6" gutterBottom>
                        Teaching Schedule
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {assignedLevels.map((level) => {
                            // **Using Optional Chaining to prevent errors**
                            const subjectsForLevel = teacher.subjects?.[level.id] || [];
                            const subjectNames = subjectsData
                                .filter(subject => subjectsForLevel.includes(subject.id))
                                .map(subject => subject.name);
                            return (
                                <Grid item xs={12} key={level.id}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Chip
                                                label={`Level: ${level.name}`}
                                                color="primary"
                                                size="small"
                                            />
                                        </Box>
                                        <Typography color="text.secondary" variant="body2" gutterBottom>
                                            Subjects:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {subjectNames.length > 0 ? (
                                                subjectNames.map((subject, subIdx) => (
                                                    <Chip
                                                        key={subIdx}
                                                        label={subject}
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ bgcolor: 'white' }}
                                                    />
                                                ))
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No subjects assigned.
                                                </Typography>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>
                            );
                        })}
                        {assignedLevels.length === 0 && (
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                    No levels assigned.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>

                    {/* Summary */}
                    <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Groups color="primary" />
                                        <Typography variant="h6">{classCount}</Typography>
                                    </Box>
                                    <Typography color="text.secondary">Total Levels</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Book color="primary" />
                                        <Typography variant="h6">{subjectCount}</Typography>
                                    </Box>
                                    <Typography color="text.secondary">Total Subjects</Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
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
        </>
   ) };

// TeachersDataScreen.jsx

const TeachersDataScreen = () => {
    // State
    const [teachersData, setTeachersData] = useState([]);
    const [levelsData, setLevelsData] = useState([]);
    const [subjectsData, setSubjectsData] = useState([]);
    const [searchName, setSearchName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [addTeacherOpen, setAddTeacherOpen] = useState(false);
    const [assignClassOpen, setAssignClassOpen] = useState(false);
    const [assignSubjectOpen, setAssignSubjectOpen] = useState(false);
    const [selectedClassForSubjects, setSelectedClassForSubjects] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedTeacherForAction, setSelectedTeacherForAction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const [currentUserSchoolId, setCurrentUserSchoolId] = useState('');

    // New States for Schools
    const [schools, setSchools] = useState([]);
    const [schoolsLoading, setSchoolsLoading] = useState(true);
    const [schoolsError, setSchoolsError] = useState(null);

    const itemsPerPage = 5;
    const theme = useTheme();

    // Fetch Current User's School ID
    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (auth.currentUser) {
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                try {
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setCurrentUserSchoolId(userData.schoolId || '');
                    } else {
                        console.error("No user document found for current user.");
                    }
                } catch (error) {
                    console.error("Error fetching current user data:", error);
                }
            }
        };

        fetchCurrentUser();
    }, []);

    // Fetch Levels
    useEffect(() => {
        const levelsRef = collection(db, "levels");
        const unsubscribe = onSnapshot(levelsRef, (snapshot) => {
            const levels = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setLevelsData(levels);
        }, (error) => {
            console.error("Error fetching levels:", error);
            setError("Failed to fetch levels.");
        });

        return () => unsubscribe();
    }, []);

    // Fetch Subjects
    useEffect(() => {
        const subjectsRef = collection(db, "subjects");
        const unsubscribe = onSnapshot(subjectsRef, (snapshot) => {
            const subjects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setSubjectsData(subjects);
        }, (error) => {
            console.error("Error fetching subjects:", error);
            setError("Failed to fetch subjects.");
        });

        return () => unsubscribe();
    }, []);

    // Fetch Schools
    useEffect(() => {
        let unsubscribe;
        try {
            const schoolsRef = collection(db, "schools");

            const fetchSchools = async () => {
                const querySnapshot = await getDocs(schoolsRef);
                if (querySnapshot.empty) setSchoolsError("No schools found in database");
                else {
                    setSchools(querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })));
                    setSchoolsLoading(false);
                }
            };

            fetchSchools();

            // Real-time listener
            unsubscribe = onSnapshot(
                schoolsRef,
                (snapshot) => {
                    setSchools(snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })));
                    setSchoolsLoading(false);
                },
                (error) => {
                    setSchoolsError(error.message);
                    setSchoolsLoading(false);
                }
            );
        } catch (error) {
            setSchoolsError(error.message);
            setSchoolsLoading(false);
        }

        // Cleanup listener on component unmount
        return () => unsubscribe && unsubscribe();
    }, []);

    // Fetch Teachers
    useEffect(() => {
        const teachersRef = collection(db, "users");
        const q = query(teachersRef, where("role", "in", ["staff", "tutor"]));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teachers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setTeachersData(teachers);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching teachers:", error);
            setError("Failed to fetch teachers. Please try again later.");
            setLoading(false);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);

    // Debounced Search Handler
    const handleSearchChange = useMemo(() => debounce((value) => {
        setSearchName(value);
    }, 300), []);

    // Handlers
    const handleAddTeacher = (newTeacher) => {
        // Real-time listener handles the state update
    };

    const handleAssignClass = async (teacherId, levelId) => {
        try {
            const teacherRef = doc(db, "users", teacherId);
            await updateDoc(teacherRef, {
                classes: arrayUnion(levelId)
            });
            setSnackbar({ open: true, message: "Level assigned successfully.", severity: 'success' });
        } catch (error) {
            console.error("Error assigning level:", error);
            setSnackbar({ open: true, message: "Failed to assign level. Please try again.", severity: 'error' });
        }
    };

    const handleAssignSubjects = async (teacherId, levelId, subjectIds) => {
        try {
            const teacherRef = doc(db, "users", teacherId);
            const teacherSnap = await getDoc(teacherRef);
            if (teacherSnap.exists()) {
                const teacherData = teacherSnap.data();
                const currentSubjects = teacherData.subjects || {};

                const updatedSubjects = {
                    ...currentSubjects,
                    [levelId]: subjectIds
                };

                await updateDoc(teacherRef, {
                    subjects: updatedSubjects
                });

                setSnackbar({ open: true, message: "Subjects assigned successfully.", severity: 'success' });
            }
        } catch (error) {
            console.error("Error assigning subjects:", error);
            setSnackbar({ open: true, message: "Failed to assign subjects. Please try again.", severity: 'error' });
        }
    };

    const handleActionClick = (event, teacher) => {
        setAnchorEl(event.currentTarget);
        setSelectedTeacherForAction(teacher);
    };

    const handleActionClose = () => {
        setAnchorEl(null);
        setSelectedTeacherForAction(null);
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Create a mapping from schoolId to schoolName for efficient lookup
    const schoolIdToNameMap = useMemo(() => {
        const map = {};
        schools.forEach(school => {
            map[school.id] = school.name;
        });
        return map;
    }, [schools]);

    // Filtering
    const filteredTeachers = useMemo(() => {
        return teachersData.filter(teacher => {
            const nameMatch = teacher.name.toLowerCase().includes(searchName.toLowerCase());
            const classMatch = selectedClass === '' ||
                (Array.isArray(teacher.classes) && teacher.classes.includes(selectedClass));
            return nameMatch && classMatch;
        });
    }, [teachersData, searchName, selectedClass]);

    // Pagination
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    const paginatedTeachers = filteredTeachers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (loading || schoolsLoading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || schoolsError) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography color="error">{error || schoolsError}</Typography>
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: { xs: 2, md: 3 } }}>
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    {/* Header */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ mb: 1 }}>
                                Teachers
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button sx={{ color: 'text.secondary' }}>Home</Button>
                                <ChevronRight sx={{ color: 'text.disabled' }} />
                                <Typography color="primary">All Teachers</Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setAddTeacherOpen(true)}
                        >
                            Add Teacher
                        </Button>
                    </Box>

                    {/* Main Content */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 3 }}>
                                All Teachers Data
                            </Typography>

                            {/* Search Section */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        placeholder="Search by name..."
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Search />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Filter by Level</InputLabel>
                                        <Select
                                            value={selectedClass}
                                            label="Filter by Level"
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                        >
                                            <MenuItem value="">All Levels</MenuItem>
                                            {levelsData
                                                .filter(level => level.schoolId === currentUserSchoolId)
                                                .sort((a, b) => a.order - b.order)
                                                .map(level => (
                                                    <MenuItem key={level.id} value={level.id}>
                                                        {level.name}
                                                    </MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            {/* Table */}
                            <TableContainer component={Paper} sx={{ mb: 2 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            {/* Removed ID Column */}
                                            <TableCell>Name</TableCell>
                                            <TableCell>Gender</TableCell>
                                            <TableCell>Teaching Load</TableCell>
                                            {/* Removed Date of Birth Column */}
                                            <TableCell>School Name</TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Address</TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Phone</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedTeachers.map((teacher) => {
                                            const { classCount, subjectCount } = getTeacherSummary(teacher);
                                            return (
                                                <TableRow key={teacher.id} hover>
                                                    {/* Removed ID Cell */}
                                                    <TableCell>
                                                        <Typography fontWeight={500}>
                                                            {teacher.name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{teacher.gender}</TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                            <Chip
                                                                icon={<Groups sx={{ fontSize: 16 }} />}
                                                                label={`${classCount} Levels`}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                            <Chip
                                                                icon={<Book sx={{ fontSize: 16 }} />}
                                                                label={`${subjectCount} Subjects`}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </Box>
                                                    </TableCell>
                                                    {/* Added School Name Cell */}
                                                    <TableCell>
                                                        {schoolIdToNameMap[teacher.schoolId] || 'Unknown'}
                                                    </TableCell>
                                                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                                        {teacher.address}
                                                    </TableCell>
                                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                        {teacher.phone}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                            <Button
                                                                size="small"
                                                                onClick={() => setSelectedTeacher(teacher)}
                                                            >
                                                                View
                                                            </Button>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => handleActionClick(e, teacher)}
                                                            >
                                                                <MoreVert />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {paginatedTeachers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    No teachers found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Pagination */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                                    {Math.min(currentPage * itemsPerPage, filteredTeachers.length)} of{' '}
                                    {filteredTeachers.length} teachers
                                </Typography>
                                <Pagination
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={(e, page) => setCurrentPage(page)}
                                    color="primary"
                                    shape="rounded"
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* Dialogs */}
                <AddTeacherDialog
                    open={addTeacherOpen}
                    onClose={() => setAddTeacherOpen(false)}
                    onAdd={handleAddTeacher}
                />

                <AssignClassDialog
                    open={assignClassOpen}
                    onClose={() => setAssignClassOpen(false)}
                    teacher={selectedTeacherForAction}
                    onAssign={handleAssignClass}
                    levelsData={levelsData}
                />

                <AssignSubjectDialog
                    open={assignSubjectOpen}
                    onClose={() => setAssignSubjectOpen(false)}
                    teacher={selectedTeacherForAction}
                    levelId={selectedClassForSubjects}
                    onAssign={handleAssignSubjects}
                    subjectsData={subjectsData}
                />

                {/* Teacher Details Modal */}
                <TeacherDetailsView
                    teacher={selectedTeacher}
                    open={!!selectedTeacher}
                    onClose={() => setSelectedTeacher(null)}
                    levelsData={levelsData}
                    subjectsData={subjectsData}
                />
            </Box>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
   ) };

export default TeachersDataScreen;
