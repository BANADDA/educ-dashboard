import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { Edit, Plus, RefreshCw, School, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../../firebase/firebaseConfig';

const SchoolsScreen = () => {
    const navigate = useNavigate();
    const [schools, setSchools] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [newSchool, setNewSchool] = useState({
        name: '',
        type: 'Public',
        address: '',
        email: '',
        phone: ''
    });
    const itemsPerPage = 5;

    // Real-time schools subscription
    useEffect(() => {
        // Set up real-time listener for schools
        const unsubscribeSchools = onSnapshot(
            collection(db, 'schools'),
            async (snapshot) => {
                try {
                    const schoolsData = [];
                    const promises = snapshot.docs.map(async (schoolDoc) => {
                        const schoolData = schoolDoc.data();

                        // Get real-time student count
                        const studentQuery = query(
                            collection(db, 'users'),
                            where('role', '==', 'student'),
                            where('schoolId', '==', schoolDoc.id)
                        );

                        // Get real-time staff count
                        const staffQuery = query(
                            collection(db, 'users'),
                            where('role', '==', 'staff'),
                            where('schoolId', '==', schoolDoc.id)
                        );

                        const [studentSnap, staffSnap] = await Promise.all([
                            getDocs(studentQuery),
                            getDocs(staffQuery)
                        ]);

                        schoolsData.push({
                            id: schoolDoc.id,
                            ...schoolData,
                            studentCount: studentSnap.size,
                            staffCount: staffSnap.size
                        });
                    });

                    await Promise.all(promises);
                    setSchools(schoolsData);
                    setLoading(false);
                } catch (error) {
                    console.error('Error in real-time update:', error);
                    toast.error('Failed to update schools data');
                }
            },
            (error) => {
                console.error('Real-time subscription error:', error);
                toast.error('Failed to subscribe to real-time updates');
            }
        );

        // Cleanup subscription
        return () => unsubscribeSchools();
    }, []);

    // Filter schools based on search and type
    const filteredSchools = schools.filter(school => {
        const matchesSearch = school.name.includes(searchTerm);
        const matchesType = !selectedType || school.type === selectedType;
        return matchesSearch && matchesType;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSchools = filteredSchools.slice(startIndex, startIndex + itemsPerPage);
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Enhanced Add School Handler with optimistic update
    const handleAddSchool = async () => {
        if (!newSchool.name || !newSchool.address || !newSchool.email || !newSchool.phone) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const schoolData = {
                name: newSchool.name,
                type: newSchool.type,
                address: newSchool.address,
                contactInfo: {
                    email: newSchool.email,
                    phone: newSchool.phone
                },
                createdAt: new Date().toISOString()
            };

            // Optimistic update
            const tempId = Date.now().toString();
            setSchools(prev => [...prev, { id: tempId, ...schoolData, studentCount: 0, staffCount: 0 }]);

            const docRef = await addDoc(collection(db, 'schools'), schoolData);

            setIsAddDialogOpen(false);
            setNewSchool({
                name: '',
                type: 'Public',
                address: '',
                email: '',
                phone: ''
            });

            toast.success('School added successfully');
        } catch (error) {
            console.error('Error adding school:', error);
            toast.error('Failed to add school');
        }
    };

    // Enhanced Edit School Handler with optimistic update
    const handleEditSchool = async () => {
        if (!selectedSchool.name || !selectedSchool.address ||
            !selectedSchool.contactInfo.email || !selectedSchool.contactInfo.phone) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const schoolRef = doc(db, 'schools', selectedSchool.id);
            const updatedData = {
                name: selectedSchool.name,
                type: selectedSchool.type,
                address: selectedSchool.address,
                contactInfo: {
                    email: selectedSchool.contactInfo.email,
                    phone: selectedSchool.contactInfo.phone
                }
            };

            // Optimistic update
            setSchools(prev => prev.map(school =>
                school.id === selectedSchool.id ? { ...school, ...updatedData } : school
            ));

            await updateDoc(schoolRef, updatedData);

            setIsEditDialogOpen(false);
            setSelectedSchool(null);
            toast.success('School updated successfully');
        } catch (error) {
            console.error('Error updating school:', error);
            toast.error('Failed to update school');
        }
    };

    // Enhanced Delete School Handler with optimistic update
    const handleDeleteSchool = async (schoolId) => {
        if (window.confirm('Are you sure you want to delete this school?')) {
            try {
                // Optimistic update
                setSchools(prev => prev.filter(school => school.id !== schoolId));

                await deleteDoc(doc(db, 'schools', schoolId));
                toast.success('School deleted successfully');
            } catch (error) {
                console.error('Error deleting school:', error);
                toast.error('Failed to delete school');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            {/* Enhanced Navigation Breadcrumb */}
            <nav className="mb-6 bg-white rounded-lg shadow-sm p-3">
                <ul className="flex space-x-2 text-sm">
                    <li>
                        <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-800 font-medium">
                            Home
                        </button>
                    </li>
                    <li className="text-gray-400">/</li>
                    <li className="text-indigo-600 font-medium">All Schools</li>
                </ul>
            </nav>

            <Card className="shadow-lg">
                <CardHeader
                    title={
                        <div className="flex items-center gap-4">
                            <Typography variant="h5" className="font-bold text-gray-800">
                                Schools Management Dashboard
                            </Typography>
                            <Tooltip title="Refresh data">
                                <IconButton
                                    onClick={() => window.location.reload()}
                                    disabled={refreshing}
                                    size="small"
                                    className="bg-blue-50 hover:bg-blue-100"
                                >
                                    <RefreshCw className={`w-5 h-5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
                                </IconButton>
                            </Tooltip>
                        </div>
                    }
                    action={
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setIsAddDialogOpen(true)}
                            startIcon={<Plus size={18} />}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                            Add School
                        </Button>
                    }
                />
                <CardContent>
                    {/* Enhanced Search and Filter Section */}
                    <div className="flex flex-wrap gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                        <TextField
                            className="flex-1 min-w-[200px]"
                            placeholder="Search by school name..."
                            variant="outlined"
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <Search className="w-4 h-4 text-gray-400 mr-2" />
                            }}
                        />
                        <FormControl className="min-w-[150px]" size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                label="Type"
                            >
                                <MenuItem value="">All Types</MenuItem>
                                <MenuItem value="public">Public</MenuItem>
                                <MenuItem value="private">Private</MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    {/* Enhanced Schools Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">School Name</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Address</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Students</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Staff</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSchools.map((school) => (
                                    <tr key={school.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-sm">{school.id.slice(0, 6)}...</td>
                                        <td className="px-4 py-3 font-medium text-blue-600">{school.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${school.type === 'public'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {school.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{school.address}</td>
                                        <td className="px-4 py-3 text-gray-600">{school.contactInfo.email}</td>
                                        <td className="px-4 py-3 text-gray-600">{school.contactInfo.phone}</td>
                                        <td className="px-4 py-3">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                                {school.studentCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">
                                                {school.staffCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Tooltip title="View levels">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/schools/${school.id}/levels`)}
                                                        className="hover:bg-green-50"
                                                    >
                                                        <School className="w-4 h-4 text-green-600" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit school">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setSelectedSchool(school);
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                        className="hover:bg-blue-50"
                                                    >
                                                        <Edit className="w-4 h-4 text-blue-600" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete school">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteSchool(school.id)}
                                                        className="hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </IconButton>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredSchools.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-gray-50">
                                <Typography variant="body1">No schools found matching your search criteria</Typography>
                            </div>
                        )}
                    </div>

                    {/* Enhanced Pagination */}
                    {filteredSchools.length > 0 && (
                        <div className="flex justify-center mt-6 gap-2">
                            <Button
                                variant="outlined"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="hover:bg-blue-50"
                            >
                                Previous
                            </Button>
                            {pageNumbers.map(number => (
                                <Button
                                    key={number}
                                    variant={currentPage === number ? "contained" : "outlined"}
                                    onClick={() => setCurrentPage(number)}
                                    className={currentPage === number
                                        ? "bg-blue-600 hover:bg-blue-700"
                                        : "hover:bg-blue-50"
                                    }
                                >
                                    {number}
                                </Button>
                            ))}
                            <Button
                                variant="outlined"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="hover:bg-blue-50"
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Enhanced Add School Dialog */}
            <Dialog
                open={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    className: "rounded-lg"
                }}
            >
                <DialogTitle className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    Add New School
                </DialogTitle>
                <DialogContent className="py-4">
                    <div className="grid gap-4 py-4">
                        <TextField
                            label="School Name"
                            value={newSchool.name}
                            onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                            fullWidth
                            required
                            variant="outlined"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={newSchool.type}
                                onChange={(e) => setNewSchool({ ...newSchool, type: e.target.value })}
                                label="Type"
                            >
                                <MenuItem value="Public">Public</MenuItem>
                                <MenuItem value="Private">Private</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Address"
                            value={newSchool.address}
                            onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                            fullWidth
                            required
                            variant="outlined"
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={newSchool.email}
                            onChange={(e) => setNewSchool({ ...newSchool, email: e.target.value })}
                            fullWidth
                            required
                            variant="outlined"
                        />
                        <TextField
                            label="Phone"
                            value={newSchool.phone}
                            onChange={(e) => setNewSchool({ ...newSchool, phone: e.target.value })}
                            fullWidth
                            required
                            variant="outlined"
                        />
                    </div>
                </DialogContent>
                <DialogActions className="border-t p-4">
                    <Button onClick={() => setIsAddDialogOpen(false)} className="hover:bg-gray-50">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddSchool}
                        variant="contained"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                        Add School
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced Edit School Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setSelectedSchool(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    className: "rounded-lg"
                }}
            >
                <DialogTitle className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    Edit School
                </DialogTitle>
                <DialogContent>
                    {selectedSchool && (
                        <div className="grid gap-4 py-4">
                            <TextField
                                label="School Name"
                                value={selectedSchool.name}
                                onChange={(e) => setSelectedSchool({
                                    ...selectedSchool,
                                    name: e.target.value
                                })}
                                fullWidth
                                required
                                variant="outlined"
                            />
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={selectedSchool.type}
                                    onChange={(e) => setSelectedSchool({
                                        ...selectedSchool,
                                        type: e.target.value
                                    })}
                                    label="Type"
                                >
                                    <MenuItem value="Public">Public</MenuItem>
                                    <MenuItem value="Private">Private</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Address"
                                value={selectedSchool.address}
                                onChange={(e) => setSelectedSchool({
                                    ...selectedSchool,
                                    address: e.target.value
                                })}
                                fullWidth
                                required
                                variant="outlined"
                            />
                            <TextField
                                label="Email"
                                type="email"
                                value={selectedSchool.contactInfo.email}
                                onChange={(e) => setSelectedSchool({
                                    ...selectedSchool,
                                    contactInfo: {
                                        ...selectedSchool.contactInfo,
                                        email: e.target.value
                                    }
                                })}
                                fullWidth
                                required
                                variant="outlined"
                            />
                            <TextField
                                label="Phone"
                                value={selectedSchool.contactInfo.phone}
                                onChange={(e) => setSelectedSchool({
                                    ...selectedSchool,
                                    contactInfo: {
                                        ...selectedSchool.contactInfo,
                                        phone: e.target.value
                                    }
                                })}
                                fullWidth
                                required
                                variant="outlined"
                            />

                            {/* Enhanced statistics cards */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                                    <Typography variant="subtitle2" className="text-blue-700 font-medium">
                                        Total Students
                                    </Typography>
                                    <Typography variant="h6" className="text-blue-900">
                                        {selectedSchool.studentCount}
                                    </Typography>
                                </div>
                                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                                    <Typography variant="subtitle2" className="text-green-700 font-medium">
                                        Total Staff
                                    </Typography>
                                    <Typography variant="h6" className="text-green-900">
                                        {selectedSchool.staffCount}
                                    </Typography>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions className="border-t p-4">
                    <Button
                        onClick={() => {
                            setIsEditDialogOpen(false);
                            setSelectedSchool(null);
                        }}
                        className="hover:bg-gray-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEditSchool}
                        variant="contained"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default SchoolsScreen;