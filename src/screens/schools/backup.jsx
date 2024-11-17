import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Book,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Edit3,
    FileText,
    GraduationCap,
    Home,
    Loader,
    MinusCircle,
    Music,
    Pause,
    Play,
    Plus,
    School,
    Search,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../../firebase/firebaseConfig';

const storage = getStorage();

// Animation variants
const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: {
        y: -5,
        boxShadow: "0 10px 25px -5px rgba(147, 51, 234, 0.1), 0 8px 10px -6px rgba(147, 51, 234, 0.1)",
        transition: { duration: 0.2 }
    }
};

const lessonVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: { height: 'auto', opacity: 1, transition: { duration: 0.3 } }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", damping: 25, stiffness: 500 }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 }
    }
};

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        {footer}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const FileUploadField = ({ label, accept, onChange, value, error }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
            {label}
        </label>
        <div className="relative">
            <input
                type="file"
                accept={accept}
                onChange={onChange}
                className="hidden"
                id={`file-${label}`}
            />
            <label
                htmlFor={`file-${label}`}
                className={`flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer
          ${error ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:bg-purple-50'}`}
            >
                <div className="flex items-center gap-2 text-sm">
                    <Upload size={18} className={error ? 'text-red-500' : 'text-purple-500'} />
                    <span className={error ? 'text-red-600' : 'text-purple-600'}>
                        {value ? value.name : 'Choose file or drag and drop'}
                    </span>
                </div>
            </label>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    </div>
);

const LessonForm = ({ lesson, onSubmit, isSubmitting }) => {
    const [title, setTitle] = useState(lesson?.title || '');
    const [document, setDocument] = useState(null);
    const [audio, setAudio] = useState(null);
    const [exercise, setExercise] = useState(lesson?.exercise || {
        title: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    });

    const addQuestion = () => {
        setExercise(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                { question: '', options: ['', '', '', ''], correctAnswer: 0 }
            ]
        }));
    };

    const removeQuestion = (index) => {
        setExercise(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, field, value) => {
        setExercise(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            )
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter lesson title"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadField
                    label="Document"
                    accept=".doc,.docx,.txt,.pdf"
                    onChange={(e) => setDocument(e.target.files[0])}
                    value={document}
                />
                <FileUploadField
                    label="Audio"
                    accept="audio/*"
                    onChange={(e) => setAudio(e.target.files[0])}
                    value={audio}
                />
            </div>

            <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Exercise</h4>
                    <button
                        onClick={addQuestion}
                        className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                        Add Question
                    </button>
                </div>

                <div className="space-y-6">
                    {exercise.questions.map((q, qIndex) => (
                        <div key={qIndex} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-medium text-gray-700">Question {qIndex + 1}</span>
                                <button
                                    onClick={() => removeQuestion(qIndex)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                                >
                                    <MinusCircle size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={q.question}
                                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Enter question"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {q.options.map((option, oIndex) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`correct-${qIndex}`}
                                                checked={q.correctAnswer === oIndex}
                                                onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                                className="text-purple-600 focus:ring-purple-500"
                                            />
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateQuestion(qIndex, 'options', q.options.map((opt, i) =>
                                                    i === oIndex ? e.target.value : opt
                                                ))}
                                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder={`Option ${oIndex + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    type="button"
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    onClick={() => onSubmit({ title, document, audio, exercise })}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    {isSubmitting ? (
                        <>
                            <Loader size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Plus size={18} />
                            Save Lesson
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

const SubjectCard = ({ subject, teachers, onEdit, onDelete, onAddLesson }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPlaying, setIsPlaying] = useState({});

    const handleAudioPlay = (lessonId, audioUrl) => {
        setIsPlaying(prev => {
            // Stop all other playing audio
            const audio = document.getElementById(`audio-${lessonId}`);
            document.querySelectorAll('audio').forEach(a => {
                if (a.id !== `audio-${lessonId}`) a.pause();
            });

            // Toggle current audio
            if (prev[lessonId]) {
                audio.pause();
                return { ...prev, [lessonId]: false };
            } else {
                audio.play();
                return { ...prev, [lessonId]: true };
            }
        });
    };

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-white rounded-xl overflow-hidden border border-purple-100 shadow-lg"
        >
            <div className="h-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />

            <div className="p-6">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {subject.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                        {subject.description || "No description provided"}
                    </p>
                </div>

                {/* Teachers Section */}
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Teachers</h4>
                    <div className="flex flex-wrap gap-2">
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
                                    {teacher.name.charAt(0)}
                                </div>
                                <span className="text-sm text-purple-700">{teacher.name}</span>
                            </div>
                        ))}
                        {teachers.length === 0 && (
                            <p className="text-sm text-gray-500">No teachers assigned yet</p>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                            <Book size={20} className="text-purple-600" />
                        </div>
                        <span className="text-lg font-semibold text-purple-600">
                            {subject.lessons?.length || 0}
                        </span>
                        <span className="text-xs text-purple-600/70">Lessons</span>
                    </div>

                    <div className="flex flex-col items-center p-3 bg-fuchsia-50 rounded-lg">
                        <div className="flex items-center justify-center w-10 h-10 bg-fuchsia-100 rounded-full mb-2">
                            <FileText size={20} className="text-fuchsia-600" />
                        </div>
                        <span className="text-lg font-semibold text-fuchsia-600">
                            {subject.lessons?.reduce((acc, l) => acc + (l.documents?.length || 0), 0) || 0}
                        </span>
                        <span className="text-xs text-fuchsia-600/70">Documents</span>
                    </div>

                    <div className="flex flex-col items-center p-3 bg-pink-50 rounded-lg">
                        <div className="flex items-center justify-center w-10 h-10 bg-pink-100 rounded-full mb-2"> <ClipboardList size={20} className="text-pink-600" />
                        </div>
                        <span className="text-lg font-semibold text-pink-600">
                            {subject.lessons?.reduce((acc, l) => acc + (l.exercise ? 1 : 0), 0) || 0}
                        </span>
                        <span className="text-xs text-pink-600/70">Exercises</span>
                    </div>
                </div>

                {/* Lessons Section */}
                <div className="mb-6">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <span className="font-semibold text-gray-700">Lessons & Materials</span>
                        <ChevronDown
                            size={20}
                            className={`text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    </button>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial="collapsed"
                                animate="expanded"
                                exit="collapsed"
                                variants={lessonVariants}
                                className="space-y-4 mt-4"
                            >
                                {subject.lessons?.map((lesson, index) => (
                                    <div key={lesson.id} className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full text-sm text-purple-600">
                                                    {index + 1}
                                                </span>
                                                {lesson.title}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onEdit(lesson)}
                                                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-colors"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(lesson.id)}
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            {/* Document */}
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <FileText size={20} className="text-blue-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h5 className="text-sm font-medium text-gray-700 truncate">
                                                        {lesson.document?.name || "Document"}
                                                    </h5>
                                                    <p className="text-xs text-gray-500">
                                                        {lesson.document?.type || "No document uploaded"}
                                                    </p>
                                                </div>
                                                {lesson.document && (
                                                    <a
                                                        href={lesson.document.url}
                                                        download
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Audio */}
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <Music size={20} className="text-green-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h5 className="text-sm font-medium text-gray-700 truncate">
                                                        {lesson.audio?.name || "Audio"}
                                                    </h5>
                                                    <p className="text-xs text-gray-500">
                                                        {lesson.audio ? (
                                                            <button
                                                                onClick={() => handleAudioPlay(lesson.id, lesson.audio.url)}
                                                                className="flex items-center gap-1 text-green-600"
                                                            >
                                                                {isPlaying[lesson.id] ? (
                                                                    <>
                                                                        <Pause size={12} /> Pause Audio
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Play size={12} /> Play Audio
                                                                    </>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            "No audio uploaded"
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Exercise Preview */}
                                        {lesson.exercise && (
                                            <div className="p-4 bg-green-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="font-medium text-green-800 flex items-center gap-2">
                                                        <GraduationCap size={18} />
                                                        {lesson.exercise.title}
                                                    </h5>
                                                    <span className="text-sm text-green-600">
                                                        {lesson.exercise.questions.length} Questions
                                                    </span>
                                                </div>
                                                <div className="text-sm text-green-600">
                                                    Click to view full exercise
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <button
                                    onClick={() => onAddLesson()}
                                    className="w-full p-4 border-2 border-dashed border-purple-200 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} />
                                    Add New Lesson
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-3">
                    <button
                        onClick={() => onEdit(subject)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Edit3 size={18} />
                        <span className="text-sm">Edit Subject</span>
                    </button>
                    <button
                        onClick={() => onAddLesson()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        <span>Add Lesson</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const SubjectsScreen = () => {
    const navigate = useNavigate();
    const { levelId } = useParams();
    const [subjects, setSubjects] = useState([]);
    const [level, setLevel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modals, setModals] = useState({
        addSubject: false,
        editSubject: false,
        addLesson: false,
        editLesson: false,
        deleteConfirm: false
    });
    const [currentLesson, setCurrentLesson] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', description: '' });
    const [editingSubject, setEditingSubject] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null); // This can be removed if not needed elsewhere
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Fetch Level Details to get schoolId and level name
    useEffect(() => {
        const fetchLevel = async () => {
            try {
                const levelRef = doc(db, 'levels', levelId);
                const levelDoc = await getDoc(levelRef);
                if (levelDoc.exists()) {
                    setLevel({ id: levelDoc.id, ...levelDoc.data() });
                    console.log('Fetched Level:', levelDoc.data());
                } else {
                    toast.error('Level not found!');
                    navigate('/schools'); // Redirect to schools overview
                    console.log('Level not found, redirecting to /schools');
                }
            } catch (error) {
                console.error('Error fetching level:', error);
                toast.error('Failed to fetch level details');
                navigate('/schools'); // Redirect on error
            }
        };

        if (levelId) {
            console.log('Fetching level with ID:', levelId);
            fetchLevel();
        }
    }, [levelId, navigate]);

    // Fetch subjects for selected level
    useEffect(() => {
        if (!levelId) {
            setSubjects([]);
            return;
        }

        setLoading(true);
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('levelId', '==', levelId)
        );

        const unsubscribeSubjects = onSnapshot(
            subjectsQuery,
            (snapshot) => {
                const subjectsData = snapshot.docs
                    .map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                        teacherIds: Array.isArray(doc.data().teacherIds) ? doc.data().teacherIds : [] // Ensure teacherIds is an array
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                console.log('Fetched Subjects:', subjectsData);
                setSubjects(subjectsData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching subjects:', error);
                toast.error('Failed to fetch subjects');
                setLoading(false);
            }
        );

        return () => unsubscribeSubjects();
    }, [levelId]);

    // Fetch teachers belonging to the same school without filtering by classes
    useEffect(() => {
        if (!level) return;

        const teachersQuery = query(
            collection(db, 'users'),
            where('role', 'in', ['staff', 'tutor']),
            where('schoolId', '==', level.schoolId)
            // Removed 'classes' filter to include all eligible teachers
        );

        const unsubscribeTeachers = onSnapshot(
            teachersQuery,
            (snapshot) => {
                const teachersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                console.log('Fetched Teachers:', teachersData);
                setTeachers(teachersData);
            },
            (error) => {
                console.error('Error fetching teachers:', error);
                toast.error('Failed to fetch teachers');
            }
        );

        return () => unsubscribeTeachers();
    }, [level, levelId]);

    // Validate form data
    const validateForm = (data) => {
        const errors = {};
        if (!data.name.trim()) {
            errors.name = 'Subject name is required';
        }
        return errors;
    };

    // Handle adding a new subject
    const handleAddSubject = async () => {
        console.log('Attempting to add subject:', newSubject);
        const errors = validateForm(newSubject);
        if (Object.keys(errors).length > 0) {
            console.log('Form Errors:', errors);
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'subjects'), {
                ...newSubject,
                name: newSubject.name.trim(),
                description: newSubject.description.trim(),
                levelId: levelId,
                schoolId: level.schoolId, // Ensure schoolId is stored
                teacherIds: [], // Initialize teacherIds array
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            console.log('Subject added successfully:', newSubject.name);
            setAddDialogOpen(false);
            setNewSubject({ name: '', description: '' });
            setFormErrors({});
            toast.success('Subject added successfully');
        } catch (error) {
            console.error('Error adding subject:', error);
            toast.error('Failed to add subject');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle editing an existing subject
    const handleEditSubject = async () => {
        console.log('Attempting to edit subject:', editingSubject);
        const errors = validateForm(editingSubject);
        if (Object.keys(errors).length > 0) {
            console.log('Form Errors:', errors);
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const subjectRef = doc(db, 'subjects', editingSubject.id);
            await updateDoc(subjectRef, {
                name: editingSubject.name.trim(),
                description: editingSubject.description.trim(),
                updatedAt: serverTimestamp(),
            });
            console.log('Subject updated successfully:', editingSubject.name);
            setEditDialogOpen(false);
            setEditingSubject(null);
            setFormErrors({});
            toast.success('Subject updated successfully');
        } catch (error) {
            console.error('Error updating subject:', error);
            toast.error('Failed to update subject');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle deleting a subject
    const handleDeleteSubject = async () => {
        console.log('Attempting to delete subject ID:', subjectToDelete);
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, 'subjects', subjectToDelete));
            console.log('Subject deleted successfully:', subjectToDelete);
            setDeleteDialogOpen(false);
            setSubjectToDelete(null);
            toast.success('Subject deleted successfully');
        } catch (error) {
            console.error('Error deleting subject:', error);
            toast.error('Failed to delete subject');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle assigning a teacher to a subject
    const handleAssignTeacher = async () => {
        if (!selectedTeacherId || !currentSubject) {
            toast.warning('Please select a teacher to assign');
            return;
        }

        setIsSubmitting(true);
        try {
            const subjectRef = doc(db, 'subjects', currentSubject.id);
            const teacherRef = doc(db, 'users', selectedTeacherId);

            // Use a Firestore transaction to ensure atomicity
            await runTransaction(db, async (transaction) => {
                const subjectDoc = await transaction.get(subjectRef);
                const teacherDoc = await transaction.get(teacherRef);

                if (!subjectDoc.exists()) {
                    throw new Error('Subject does not exist!');
                }

                if (!teacherDoc.exists()) {
                    throw new Error('Teacher does not exist!');
                }

                // Update subject's teacherIds
                transaction.update(subjectRef, {
                    teacherIds: arrayUnion(selectedTeacherId),
                    updatedAt: serverTimestamp()
                });
                console.log(`Added teacherId ${selectedTeacherId} to subject ${currentSubject.id}`);

                // Update teacher's subjects and classes
                transaction.update(teacherRef, {
                    [`subjects.${levelId}`]: arrayUnion(currentSubject.id),
                    updatedAt: serverTimestamp(),
                    classes: arrayUnion(levelId) // Automatically assign levelId to classes
                });
                console.log(`Added subjectId ${currentSubject.id} to teacher ${selectedTeacherId}'s subjects`);
                console.log(`Added levelId ${levelId} to teacher ${selectedTeacherId}'s classes`);
            });

            console.log(`Assigned teacher ${selectedTeacherId} to subject ${currentSubject.id}`);
            toast.success('Teacher assigned successfully');
            setAssignDialogOpen(false);
            setCurrentSubject(null);
            setSelectedTeacherId('');
        } catch (error) {
            console.error('Error assigning teacher:', error);
            if (error.code === 'permission-denied') {
                toast.error('You do not have permission to assign teachers.');
            } else {
                toast.error(error.message || 'Failed to assign teacher.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle removing a teacher from a subject
    const handleRemoveTeacher = async (teacherId, subjectId) => { // Updated to accept subjectId
        console.log('handleRemoveTeacher called with teacherId:', teacherId, 'subjectId:', subjectId);

        setIsSubmitting(true);
        try {
            const subjectRef = doc(db, 'subjects', subjectId);
            const teacherRef = doc(db, 'users', teacherId);

            // Start Firestore transaction
            await runTransaction(db, async (transaction) => {
                console.log('Transaction started.');

                const subjectDoc = await transaction.get(subjectRef);
                if (!subjectDoc.exists()) {
                    throw new Error('Subject does not exist!');
                }
                console.log('Fetched subject document:', subjectDoc.data());

                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) {
                    throw new Error('Teacher does not exist!');
                }
                console.log('Fetched teacher document:', teacherDoc.data());

                // Remove teacherId from subject's teacherIds
                transaction.update(subjectRef, {
                    teacherIds: arrayRemove(teacherId),
                    updatedAt: serverTimestamp()
                });
                console.log(`Removed teacherId ${teacherId} from subject ${subjectId}`);

                // Update teacher's subjects
                const teacherData = teacherDoc.data();
                const teacherSubjects = teacherData.subjects || {};
                const updatedSubjects = teacherSubjects[levelId] || [];

                console.log(`Teacher's current subjects for level ${levelId}:`, updatedSubjects);

                // Remove the subject ID from the teacher's subjects for the level
                const updatedSubjectIds = updatedSubjects.filter(id => id !== subjectId);
                const updateData = {};

                if (updatedSubjectIds.length > 0) {
                    updateData[`subjects.${levelId}`] = updatedSubjectIds;
                    console.log(`Updated subjects for level ${levelId}:`, updatedSubjectIds);
                } else {
                    // If no subjects left in this level, remove the levelId from classes
                    updateData[`subjects.${levelId}`] = arrayRemove(subjectId);
                    updateData['classes'] = arrayRemove(levelId);
                    console.log(`No subjects left in level ${levelId}. Removed levelId from classes.`);
                }

                updateData['updatedAt'] = serverTimestamp();

                transaction.update(teacherRef, updateData);
                console.log(`Updated teacher document for teacherId ${teacherId}`);
            });

            console.log(`Successfully removed teacher ${teacherId} from subject ${subjectId}`);
            toast.success('Teacher removed successfully');
        } catch (error) {
            console.error('Error removing teacher:', error);
            if (error.code === 'permission-denied') {
                toast.error('You do not have permission to remove teachers.');
            } else {
                toast.error(error.message || 'Failed to remove teacher.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter subjects based on search query
    const filteredSubjects = useMemo(() => {
        return subjects.filter(subject =>
            subject.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [subjects, searchQuery]);

    const [lessons, setLessons] = useState({});

// Add this useEffect to fetch lessons for each subject:
useEffect(() => {
  if (!subjects.length) return;

  const fetchLessons = async () => {
    const lessonsMap = {};
    
    for (const subject of subjects) {
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('subjectId', '==', subject.id)
      );

      const unsubscribe = onSnapshot(
        lessonsQuery,
        (snapshot) => {
          const subjectLessons = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setLessons(prev => ({
            ...prev,
            [subject.id]: subjectLessons
          }));
        },
        (error) => {
          console.error('Error fetching lessons:', error);
          toast.error('Failed to fetch lessons');
        }
      );
    }
  };

  fetchLessons();
}, [subjects]);

    // Clear form errors when dialogs are closed
    const clearFormErrors = () => {
        setFormErrors({});
    };

    const handleLessonSubmit = async (lessonData) => {
        setIsSubmitting(true);
        try {
          // Upload files first
          const uploads = await Promise.all([
            lessonData.document && uploadFile(lessonData.document, 'documents'),
            lessonData.audio && uploadFile(lessonData.audio, 'audio')
          ]);
      
          const [documentUrl, audioUrl] = uploads;
      
          const lessonPayload = {
            title: lessonData.title,
            document: documentUrl ? {
              name: lessonData.document.name,
              type: lessonData.document.type,
              url: documentUrl
            } : null,
            audio: audioUrl ? {
              name: lessonData.audio.name,
              type: lessonData.audio.type,
              url: audioUrl
            } : null,
            exercise: lessonData.exercise,
            subjectId: currentSubject.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
      
          if (currentLesson) {
            // Update existing lesson
            await updateDoc(doc(db, 'lessons', currentLesson.id), {
              ...lessonPayload,
              updatedAt: serverTimestamp()
            });
            toast.success('Lesson updated successfully');
          } else {
            // Add new lesson
            await addDoc(collection(db, 'lessons'), lessonPayload);
            toast.success('Lesson added successfully');
          }
      
          setModals(m => ({ ...m, addLesson: false, editLesson: false }));
          setCurrentLesson(null);
        } catch (error) {
          console.error('Error submitting lesson:', error);
          toast.error('Failed to save lesson');
        } finally {
          setIsSubmitting(false);
        }
      };
      
      const uploadFile = async (file, folder) => {
        if (!file) return null;
        
        const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL*(storageRef);
        return url;
      };
      
      const handleDeleteLesson = async (lessonId) => {
        setIsSubmitting(true);
        try {
          await deleteDoc(doc(db, 'lessons', lessonId));
          toast.success('Lesson deleted successfully');
          setModals(m => ({ ...m, deleteConfirm: false }));
          setCurrentLesson(null);
        } catch (error) {
          console.error('Error deleting lesson:', error);
          toast.error('Failed to delete lesson');
        } finally {
          setIsSubmitting(false);
        }
      };
      
      const handleEditLesson = (lesson) => {
        setCurrentLesson(lesson);
        setModals(m => ({ ...m, editLesson: true }));
      };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
            {/* Navigation */}
            <nav className="flex items-center space-x-2 mb-8 text-sm">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                    <Home size={18} />
                </button>
                <ChevronRight size={16} className="text-gray-400" />
                <button
                    onClick={() => navigate('/schools')}
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
                >
                    <School size={18} />
                    <span>Schools</span>
                </button>
                <ChevronRight size={16} className="text-gray-400" />
                <button
                    onClick={() => navigate(`/schools/${level?.schoolId}/levels`)}
                    className="text-purple-600 hover:text-purple-700"
                >
                    Levels
                </button>
                <ChevronRight size={16} className="text-gray-400" />
                <span className="text-gray-600">
                    {level?.name || 'Subjects'}
                </span>
            </nav>

            {/* Main Content */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                        {level?.name} - Subject Management
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search subjects..."
                                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setCurrentSubject(null);
                                setModals(m => ({ ...m, addSubject: true }));
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Add Subject
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader className="w-8 h-8 text-purple-600 animate-spin mb-4" />
                        <p className="text-gray-600">Loading subjects...</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {subjects.map(subject => (
                            <SubjectCard
                                key={subject.id}
                                subject={subject}
                                teachers={teachers.filter(t => subject.teacherIds?.includes(t.id))}
                                onEdit={(subject) => {
                                    setCurrentSubject(subject);
                                    setModals(m => ({ ...m, editSubject: true }));
                                }}
                                onDelete={(subjectId) => {
                                    setCurrentSubject(subjects.find(s => s.id === subjectId));
                                    setModals(m => ({ ...m, deleteConfirm: true }));
                                }}
                                onAddLesson={() => {
                                    setCurrentSubject(subject);
                                    setCurrentLesson(null);
                                    setModals(m => ({ ...m, addLesson: true }));
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal
                isOpen={modals.addSubject || modals.editSubject}
                onClose={() => setModals(m => ({ ...m, addSubject: false, editSubject: false }))}
                title={currentSubject ? 'Edit Subject' : 'Add New Subject'}
            >
                {/* Subject Form */}
            </Modal>

            <Modal
                isOpen={modals.addLesson || modals.editLesson}
                onClose={() => setModals(m => ({ ...m, addLesson: false, editLesson: false }))}
                title={currentLesson ? 'Edit Lesson' : 'Add New Lesson'}
            >
                <LessonForm
                    lesson={currentLesson}
                    onSubmit={handleLessonSubmit}
                    isSubmitting={isSubmitting}
                />
            </Modal>

            <Modal
                isOpen={modals.deleteConfirm}
                onClose={() => setModals(m => ({ ...m, deleteConfirm: false }))}
                title="Delete Subject"
            >
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-gray-600">
                            Are you sure you want to delete this subject? This action cannot be undone and will remove all associated lessons and materials.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={() => setModals(m => ({ ...m, deleteConfirm: false }))}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteSubject}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 size={18} />
                                Delete Subject
                            </>
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default SubjectsScreen;