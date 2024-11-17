import {
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Container,
    FormControl,
    Grid,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { db } from "../../firebase/firebaseConfig";

const validateStudent = (student) => ({
    id: student.id,
    name: student.name || 'Unknown',
    email: student.email || 'N/A',
    levelId: student.levelId || null,
    parentId: student.parentId || 'N/A',
    schoolId: student.schoolId || null,
    role: student.role || 'unknown',
    createdAt: student.createdAt || null,
    updatedAt: student.updatedAt || null
});

const StudentsDataScreen = () => {
    const [students, setStudents] = useState([]);
    const [schools, setSchools] = useState([]);
    const [levels, setLevels] = useState([]);
    const [parents, setParents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchool, setSelectedSchool] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Fetch all required data
    const fetchData = async () => {
        setLoading(true);
        try {
            // Safely fetch schools
            const schoolsSnapshot = await getDocs(collection(db, "schools"));
            const schoolsData = schoolsSnapshot.docs.reduce((acc, doc) => {
                const school = { id: doc.id, ...doc.data() };
                acc[doc.id] = school;
                return acc;
            }, {});
            setSchools(schoolsData);
    
            // Safely fetch levels
            const levelsSnapshot = await getDocs(collection(db, "levels"));
            const levelsData = levelsSnapshot.docs.reduce((acc, doc) => {
                const level = { id: doc.id, ...doc.data() };
                acc[doc.id] = level;
                return acc;
            }, {});
            setLevels(levelsData);
    
            // Safely fetch users
            const usersSnapshot = await getDocs(collection(db, "users"));
            const parentsData = {};
            const studentsData = [];
            usersSnapshot.docs.forEach(doc => {
                const userData = { id: doc.id, ...doc.data() };
                if (userData.role === 'parent') {
                    parentsData[doc.id] = userData;
                } else if (userData.role === 'student') {
                    studentsData.push(validateStudent(userData));
                }
            });
            setParents(parentsData);
            setStudents(studentsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Failed to load data. Please try again.");
            setSnackbar({
                open: true,
                message: "Error loading data. Please try again later.",
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };
    

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        await fetchData();
        setSnackbar({
            open: true,
            message: 'Data refreshed successfully',
            severity: 'success'
        });
    };

    const handleSearchChange = useMemo(
        () => debounce((value) => setSearchTerm(value), 300),
        []
    );

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const searchMatch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (parents[student.parentId]?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const schoolMatch = !selectedSchool || student.schoolId === selectedSchool;
            const levelMatch = !selectedLevel || student.levelId === selectedLevel;
            return searchMatch && schoolMatch && levelMatch;
        });
    }, [students, parents, searchTerm, selectedSchool, selectedLevel]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
            <Container maxWidth="xl">
                {/* Header */}
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="h4" gutterBottom>
                            Students
                        </Typography>
                        <Typography color="textSecondary">
                            Managing {filteredStudents.length} students
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            sx={{ mr: 2 }}
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => {/* Add export functionality */}}
                        >
                            Export
                        </Button>
                    </Grid>
                </Grid>

                {/* Filters */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                placeholder="Search by student or parent name..."
                                onChange={(e) => handleSearchChange(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>School</InputLabel>
                                <Select
                                    value={selectedSchool}
                                    label="School"
                                    onChange={(e) => setSelectedSchool(e.target.value)}
                                >
                                    <MenuItem value="">All Schools</MenuItem>
                                    {Object.values(schools).map((school) => (
                                        <MenuItem key={school.id} value={school.id}>
                                            {school.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>Level</InputLabel>
                                <Select
                                    value={selectedLevel}
                                    label="Level"
                                    onChange={(e) => setSelectedLevel(e.target.value)}
                                >
                                    <MenuItem value="">All Levels</MenuItem>
                                    {Object.values(levels).map((level) => (
                                        <MenuItem key={level.id} value={level.id}>
                                            {level.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Table */}
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Student Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>School</TableCell>
                                    <TableCell>Level</TableCell>
                                    <TableCell>Parent Name</TableCell>
                                    <TableCell>Created At</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredStudents
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((student) => (
                                        <TableRow key={student.id} hover>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell>
                                                {schools[student.schoolId]?.name || 'Unknown School'}
                                            </TableCell>
                                            <TableCell>
                                                {levels[student.levelId]?.name || 'Unknown Level'}
                                            </TableCell>
                                            <TableCell>
                                                {parents[student.parentId]?.name || 'Unknown Parent'}
                                            </TableCell>
                                            <TableCell>
                                                {student.createdAt ? new Date(student.createdAt).toLocaleString() : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {filteredStudents.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            No students found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={filteredStudents.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                    />
                </Card>
            </Container>

            {/* Notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default StudentsDataScreen;