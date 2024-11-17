import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Book,
    ChevronRight,
    Clock,
    Download,
    Edit3,
    FileText,
    GraduationCap,
    Loader,
    MoreVertical,
    Music,
    Pause,
    Play,
    Plus,
    Settings,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../../firebase/firebaseConfig';

// Animation variants
const variants = {
    card: {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        hover: {
            y: -4,
            transition: { duration: 0.2 }
        }
    },
    container: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                duration: 0.3
            }
        }
    }
};

// Lesson Card Component
const LessonCard = ({ lesson, onPlay, isPlaying }) => {
    return (
        <motion.div
            variants={variants.card}
            whileHover="hover"
            className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden group"
        >
            {/* Gradient Bar */}
            <div className="h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />

            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {lesson.title}
                    </h3>
                    <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={18} />
                    </button>
                </div>

                {/* Materials */}
                <div className="space-y-3">
                    {lesson.materials?.map((material, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${material.document ? 'bg-blue-50' : 'bg-green-50'} flex items-center justify-center`}>
                                    {material.document ? (
                                        <FileText className="text-blue-500" />
                                    ) : (
                                        <Music className="text-green-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 line-clamp-1">
                                        {material.document?.name || material.audio?.name || 'Untitled'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {material.document ? 'Document' : 'Audio'}
                                    </p>
                                </div>
                            </div>

                            {material.document ? (
                                <a
                                    href={material.document.url}
                                    download
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Download size={16} />
                                </a>
                            ) : material.audio && (
                                <button
                                    onClick={() => onPlay(lesson.id, idx, material.audio.url)}
                                    className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Exercise Preview */}
                {lesson.exercise && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                    <GraduationCap className="text-green-600" size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-green-800">
                                        {lesson.exercise.title || 'Exercise'}
                                    </h4>
                                    <p className="text-xs text-green-600">
                                        {lesson.exercise.questions.length} Questions
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-green-600">
                                <Clock size={14} />
                                <span className="text-xs font-medium">20 mins</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end">
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                        View Details
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// Student Card Component
const StudentCard = ({ student }) => {
    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-medium">
                        {student.name.charAt(0)}
                    </span>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-gray-800">
                        {student.name}
                    </h4>
                    <p className="text-xs text-gray-500">{student.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                    Last active: 2 hours ago
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">Online</span>
                </div>
            </div>
        </div>
    );
};

// Main Component
const SubjectDetailsScreen = () => {
    const { subjectId, levelId } = useParams();
    const navigate = useNavigate();
    const [subject, setSubject] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [students, setStudents] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState({});

    useEffect(() => {
        if (!subjectId || !levelId) return;

        const fetchData = async () => {
            try {
                // Fetch subject details
                const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
                if (subjectDoc.exists()) {
                    setSubject({ id: subjectDoc.id, ...subjectDoc.data() });
                }

                // Fetch students
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student'),
                    where('levelId', '==', levelId)
                );
                const studentsSnapshot = await getDocs(studentsQuery);
                setStudents(studentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })));

                // Fetch lessons with realtime updates
                const lessonsQuery = query(
                    collection(db, 'lessons'),
                    where('subjectId', '==', subjectId)
                );

                const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                    const lessonsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setLessons(lessonsData);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load subject data');
                setLoading(false);
            }
        };

        fetchData();
    }, [subjectId, levelId]);

    const handleAudioPlay = (lessonId, materialIndex, audioUrl) => {
        const audioKey = `${lessonId}-${materialIndex}`;
        setIsPlaying(prev => {
            const newState = { ...prev };

            // Pause all other playing audio
            Object.keys(newState).forEach(key => {
                if (key !== audioKey) {
                    const audio = document.getElementById(key);
                    if (audio) audio.pause();
                    newState[key] = false;
                }
            });

            // Toggle current audio
            const audio = document.getElementById(audioKey);
            if (!audio) {
                const newAudio = new Audio(audioUrl);
                newAudio.id = audioKey;
                document.body.appendChild(newAudio);
                newAudio.play();
                newState[audioKey] = true;
            } else {
                if (newState[audioKey]) {
                    audio.pause();
                    newState[audioKey] = false;
                } else {
                    audio.play();
                    newState[audioKey] = true;
                }
            }

            return newState;
        });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <motion.div
                        variants={variants.container}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {lessons.map(lesson => (
                            <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                onPlay={handleAudioPlay}
                                isPlaying={isPlaying[lesson.id]}
                            />
                        ))}
                    </motion.div>
                );

            case 'lessons':
                return (
                    <div className="space-y-6">
                        {lessons.map(lesson => (
                            <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                onPlay={handleAudioPlay}
                                isPlaying={isPlaying[lesson.id]}
                            />
                        ))}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => navigate(`/subjects/${levelId}/${subjectId}/add-lesson`)}
                            className="w-full p-4 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            Add New Lesson
                        </motion.button>
                    </div>
                );

            case 'assignments':
                return (
                    <div className="space-y-6">
                        {lessons
                            .filter(lesson => lesson.exercise)
                            .map(lesson => (
                                <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            {lesson.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-gray-400" />
                                            <span className="text-sm text-gray-600">20 minutes</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="text-green-600" />
                                                <span className="font-medium text-green-800">
                                                    {lesson.exercise.questions.length} Questions
                                                </span>
                                            </div>
                                            <button className="text-green-600 font-medium text-sm">
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                );

            case 'students':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
                        {students.map(student => (
                            <StudentCard key={student.id} student={student} />
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-xl font-semibold text-gray-800">
                                {subject?.name}
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                                <Edit3 size={18} />
                                <span className="text-sm font-medium">Edit Subject</span>
                            </button>
                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Book className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Lessons</p>
                                <h4 className="text-2xl font-bold text-gray-900">{lessons.length}</h4>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileText className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Learning Materials</p>
                                <h4 className="text-2xl font-bold text-gray-900">
                                    {lessons.reduce((acc, lesson) => acc + (lesson.materials?.length || 0), 0)}
                                </h4>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <Users className="text-green-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Students Enrolled</p>
                                <h4 className="text-2xl font-bold text-gray-900">{students.length}</h4>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                <GraduationCap className="text-orange-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Assignments</p>
                                <h4 className="text-2xl font-bold text-gray-900">
                                    {lessons.filter(lesson => lesson.exercise).length}
                                </h4>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="flex border-b border-gray-200">
                        {['overview', 'lessons', 'assignments', 'students'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    px-6 py-4 text-sm font-medium transition-colors relative
                                    ${activeTab === tab
                                        ? 'text-purple-600 border-b-2 border-purple-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }
                                `}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab === activeTab && (
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                                        layoutId="activeTab"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderTabContent()}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default SubjectDetailsScreen;