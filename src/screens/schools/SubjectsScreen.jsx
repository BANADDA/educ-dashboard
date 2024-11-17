import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from '@mui/material';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Book,
    ChevronRight,
    ClipboardList,
    Download,
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
    View,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../../firebase/firebaseConfig';

// Initialize Firebase Storage
const storage = getStorage();

// Animation Variants
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

// File Upload Field Component
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

const validateSubject = (subject) => {
    const errors = {};
    
    if (!subject?.name?.trim()) {
      errors.name = 'Subject name is required';
    }
    
    if (!subject?.description?.trim()) {
      errors.description = 'Subject description is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  const validateLesson = (lessonData) => {
    const errors = {};
    
    if (!lessonData?.title?.trim()) {
      errors.title = 'Lesson title is required';
    }
    
    // Validate exercise if it exists
    if (lessonData?.exercise) {
      if (!lessonData.exercise.title?.trim()) {
        errors.exerciseTitle = 'Exercise title is required';
      }
      
      // Validate questions
      const questionErrors = [];
      lessonData.exercise.questions.forEach((question, index) => {
        const qErrors = {};
        
        if (!question.question?.trim()) {
          qErrors.question = 'Question text is required';
        }
        
        // Check if all options are filled
        const emptyOptions = question.options.filter(opt => !opt.trim());
        if (emptyOptions.length > 0) {
          qErrors.options = 'All options must be filled';
        }
        
        if (Object.keys(qErrors).length > 0) {
          questionErrors[index] = qErrors;
        }
      });
      
      if (questionErrors.length > 0) {
        errors.questions = questionErrors;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

// Lesson Form Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/50">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col relative"
        >
          {/* Fixed Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
  
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
  
          {/* Fixed Footer - Will be part of the LessonForm */}
        </motion.div>
      </div>
    );
};
  
  const LessonForm = ({ lesson, onSubmit, onClose, isSubmitting }) => {
      const [title, setTitle] = useState(lesson?.title || '');
      const [materials, setMaterials] = useState(lesson?.materials || [
          { document: null, audio: null }
      ]);
      const [exercise, setExercise] = useState(lesson?.exercise || {
          title: '',
          questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
      });
  
      const addMaterialPair = () => {
          setMaterials(prev => [...prev, { document: null, audio: null }]);
      };
  
      const removeMaterialPair = (index) => {
          setMaterials(prev => prev.filter((_, i) => i !== index));
      };
  
      const updateMaterial = (index, type, file) => {
          setMaterials(prev => prev.map((material, i) => 
              i === index ? { ...material, [type]: file } : material
          ));
      };
  
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
  
              {/* Learning Materials Section */}
              <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Learning Materials</h4>
                      <button
                          onClick={addMaterialPair}
                          className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                          <Plus size={18} />
                          Add Material Pair
                      </button>
                  </div>
  
                  <div className="space-y-6">
                      {materials.map((material, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start mb-4">
                                  <span className="font-medium text-gray-700">Material Set {index + 1}</span>
                                  {materials.length > 1 && (
                                      <button
                                          onClick={() => removeMaterialPair(index)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                                      >
                                          <MinusCircle size={18} />
                                      </button>
                                  )}
                              </div>
  
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FileUploadField
                                      label="Document"
                                      accept=".doc,.docx,.txt,.pdf"
                                      onChange={(e) => updateMaterial(index, 'document', e.target.files[0])}
                                      value={material.document}
                                  />
                                  <FileUploadField
                                      label="Corresponding Audio"
                                      accept="audio/*"
                                      onChange={(e) => updateMaterial(index, 'audio', e.target.files[0])}
                                      value={material.audio}
                                  />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
  
              {/* Exercise Section */}
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
  
              <div className="flex justify-end gap-4 sticky bottom-0 bg-white py-4 border-t border-gray-200 mt-6">
                  <button
                      type="button"
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={onClose}
                      disabled={isSubmitting}
                  >
                      Cancel
                  </button>
                  <button
                      onClick={() => onSubmit({ title, materials, exercise })}
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

// Subject Card Component
const SubjectCard = ({
    subject,
    levelId,
    lessons = [],
    teachers,
    onEdit,
    onDelete,
    onAddLesson,
    onEditLesson,
    onDeleteLesson,
    onAssignTeacher,
    onRemoveTeacher
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPlaying, setIsPlaying] = useState({});
    const navigate = useNavigate();

    const statsData = {
        lessons: lessons.length,
        documents: lessons.filter(lesson => lesson.document).length,
        exercises: lessons.filter(lesson => lesson.exercise).length
    };
  
    const handleAudioPlay = (lessonId, audioUrl) => {
      setIsPlaying(prev => {
        const audio = document.getElementById(`audio-${lessonId}`);
        document.querySelectorAll('audio').forEach(a => {
          if (a.id !== `audio-${lessonId}`) a.pause();
        });
  
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
          {/* Subject Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {subject.name}
              </h3>
              <p className="text-gray-600 text-sm">
                {subject.description || "No description provided"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(subject)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
              >
                <Edit3 size={18} />
              </button>
              <button
                onClick={() => onDelete(subject.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
  
          {/* Teachers Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Assigned Teachers</h4>
              <button
                onClick={() => onAssignTeacher(subject.id)}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus size={16} />
                Assign
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {teachers.map(teacher => (
                <div key={teacher.id} className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
                    {teacher.name.charAt(0)}
                  </div>
                  <span className="text-sm text-purple-700">{teacher.name}</span>
                  <button
                    onClick={() => onRemoveTeacher(teacher.id, subject.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {teachers.length === 0 && (
                <p className="text-sm text-gray-500">No teachers assigned</p>
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
                    {statsData.lessons}
                </span>
                <span className="text-xs text-purple-600/70">Lessons</span>
            </div>

            <div className="flex flex-col items-center p-3 bg-fuchsia-50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-fuchsia-100 rounded-full mb-2">
                    <FileText size={20} className="text-fuchsia-600" />
                </div>
                <span className="text-lg font-semibold text-fuchsia-600">
                    {statsData.documents}
                </span>
                <span className="text-xs text-fuchsia-600/70">Documents</span>
            </div>

            <div className="flex flex-col items-center p-3 bg-pink-50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-pink-100 rounded-full mb-2">
                    <ClipboardList size={20} className="text-pink-600" />
                </div>
                <span className="text-lg font-semibold text-pink-600">
                    {statsData.exercises}
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
                        <ChevronRight
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
              onClick={() => navigate(`/subjects/${levelId}/${subject.id}`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <View size={18} />
              <span>View Subject</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  };
  
  // Main SubjectsScreen Component
  const SubjectsScreen = () => {
    const navigate = useNavigate();
    const { levelId } = useParams();
    
    // State Management
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [lessons, setLessons] = useState({});
    const [level, setLevel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
  
    // Modal States
    const [modals, setModals] = useState({
      addSubject: false,
      editSubject: false,
      addLesson: false,
      editLesson: false,
      deleteConfirm: false,
      assignTeacher: false
    });
  
    // Effects
    useEffect(() => {
      const fetchLevel = async () => {
        if (!levelId) return;
        
        try {
          const levelDoc = await getDoc(doc(db, 'levels', levelId));
          if (levelDoc.exists()) {
            setLevel({ id: levelDoc.id, ...levelDoc.data() });
          } else {
            toast.error('Level not found');
            navigate('/schools');
          }
        } catch (error) {
          console.error('Error fetching level:', error);
          toast.error('Failed to fetch level details');
        }
      };
  
      fetchLevel();
    }, [levelId, navigate]);
  
    // Continuing from previous SubjectsScreen component...

  // Fetch Subjects Effect
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

    const unsubscribe = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        const subjectsData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            teacherIds: Array.isArray(doc.data().teacherIds) ? doc.data().teacherIds : []
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(subjectsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching subjects:', error);
        toast.error('Failed to fetch subjects');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [levelId]);

  // Fetch Teachers Effect
  useEffect(() => {
    if (!level?.schoolId) return;

    const teachersQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['staff', 'tutor']),
      where('schoolId', '==', level.schoolId)
    );

    const unsubscribe = onSnapshot(
      teachersQuery,
      (snapshot) => {
        const teachersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeachers(teachersData);
      },
      (error) => {
        console.error('Error fetching teachers:', error);
        toast.error('Failed to fetch teachers');
      }
    );

    return () => unsubscribe();
  }, [level?.schoolId]);

  // Fetch Lessons Effect
  useEffect(() => {
    if (!subjects.length) return;

    const unsubscribes = subjects.map(subject => {
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('subjectId', '==', subject.id)
      );

      return onSnapshot(
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
    });

    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [subjects]);

  // File Upload Handler
  const uploadFile = async (file, folder) => {
    if (!file) return null;
    
    const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Subject Handlers
  const handleAddSubject = async (subjectData) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'subjects'), {
        ...subjectData,
        levelId,
        schoolId: level.schoolId,
        teacherIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('Subject added successfully');
      setModals(m => ({ ...m, addSubject: false }));
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubject = async (subjectData) => {
    if (!currentSubject) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'subjects', currentSubject.id), {
        ...subjectData,
        updatedAt: serverTimestamp()
      });
      toast.success('Subject updated successfully');
      setModals(m => ({ ...m, editSubject: false }));
      setCurrentSubject(null);
    } catch (error) {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!currentSubject) return;

    setIsSubmitting(true);
    try {
      // Delete all lessons first
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('subjectId', '==', currentSubject.id)
      );
      const lessonsSnapshot = await getDocs(lessonsQuery);
      await Promise.all(
        lessonsSnapshot.docs.map(async (doc) => {
          const lesson = doc.data();
          // Delete associated files
          if (lesson.document?.url) {
            const documentRef = ref(storage, lesson.document.url);
            await deleteObject(documentRef).catch(console.error);
          }
          if (lesson.audio?.url) {
            const audioRef = ref(storage, lesson.audio.url);
            await deleteObject(audioRef).catch(console.error);
          }
          await deleteDoc(doc.ref);
        })
      );

      // Delete the subject
      await deleteDoc(doc(db, 'subjects', currentSubject.id));
      
      toast.success('Subject deleted successfully');
      setModals(m => ({ ...m, deleteConfirm: false }));
      setCurrentSubject(null);
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Teacher Assignment Handlers
  const handleAssignTeacher = async () => {
    if (!selectedTeacher || !currentSubject) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const subjectRef = doc(db, 'subjects', currentSubject.id);
        const teacherRef = doc(db, 'users', selectedTeacher);

        // Update subject's teacherIds
        transaction.update(subjectRef, {
          teacherIds: arrayUnion(selectedTeacher),
          updatedAt: serverTimestamp()
        });

        // Update teacher's subjects and classes
        transaction.update(teacherRef, {
          [`subjects.${levelId}`]: arrayUnion(currentSubject.id),
          classes: arrayUnion(levelId),
          updatedAt: serverTimestamp()
        });
      });

      toast.success('Teacher assigned successfully');
      setModals(m => ({ ...m, assignTeacher: false }));
      setSelectedTeacher('');
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast.error('Failed to assign teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTeacher = async (teacherId, subjectId) => {
    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const subjectRef = doc(db, 'subjects', subjectId);
        const teacherRef = doc(db, 'users', teacherId);

        // Update subject's teacherIds
        transaction.update(subjectRef, {
          teacherIds: arrayRemove(teacherId),
          updatedAt: serverTimestamp()
        });

        // Update teacher's subjects and classes
        transaction.update(teacherRef, {
          [`subjects.${levelId}`]: arrayRemove(subjectId),
          classes: arrayRemove(levelId),
          updatedAt: serverTimestamp()
        });
      });

      toast.success('Teacher removed successfully');
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast.error('Failed to remove teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lesson Handlers
  // Validation utility for lessons
const validateLesson = (lessonData) => {
    const errors = {};
    
    // Required title validation
    if (!lessonData?.title?.trim()) {
      errors.title = 'Lesson title is required';
    }
    
    // Exercise validation if it exists
    if (lessonData?.exercise?.questions?.length > 0) {
      const questionErrors = [];
      lessonData.exercise.questions.forEach((question, index) => {
        const qErrors = {};
        
        if (!question.question?.trim()) {
          qErrors.question = 'Question text is required';
        }
        
        // Check if at least two options are filled
        const filledOptions = question.options.filter(opt => opt.trim()).length;
        if (filledOptions < 2) {
          qErrors.options = 'At least two options are required';
        }
        
        if (Object.keys(qErrors).length > 0) {
          questionErrors[index] = qErrors;
        }
      });
      
      if (questionErrors.length > 0) {
        errors.questions = questionErrors;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Updated handler with validation
  const handleLessonSubmit = async (lessonData) => {
    if (!currentSubject) return;

    setIsSubmitting(true);
    try {
        // Upload all materials
        const uploadedMaterials = await Promise.all(
            lessonData.materials.map(async (material) => {
                const [documentUrl, audioUrl] = await Promise.all([
                    material.document && uploadFile(material.document, 'documents'),
                    material.audio && uploadFile(material.audio, 'audio')
                ]);

                return {
                    document: documentUrl ? {
                        name: material.document.name,
                        type: material.document.type,
                        url: documentUrl
                    } : null,
                    audio: audioUrl ? {
                        name: material.audio.name,
                        type: material.audio.type,
                        url: audioUrl
                    } : null
                };
            })
        );

        const lessonPayload = {
            title: lessonData.title,
            materials: uploadedMaterials,
            exercise: lessonData.exercise,
            subjectId: currentSubject.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        if (currentLesson) {
            await updateDoc(doc(db, 'lessons', currentLesson.id), {
                ...lessonPayload,
                updatedAt: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, 'lessons'), lessonPayload);
        }

        toast.success(`Lesson ${currentLesson ? 'updated' : 'added'} successfully`);
        setModals(m => ({ ...m, addLesson: false, editLesson: false }));
        setCurrentLesson(null);
    } catch (error) {
        console.error('Error submitting lesson:', error);
        toast.error('Failed to save lesson');
    } finally {
        setIsSubmitting(false);
    }
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
        {/* Header */}
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

        {/* Subjects Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="w-8 h-8 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading subjects...</p>
          </div>
        ) : subjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subjects
              .filter(subject => 
                subject.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(subject => (
                <SubjectCard
                  key={subject.id}
                  levelId={levelId} 
                  subject={subject}
                  lessons={lessons[subject.id] || []}
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
                  onEditLesson={(lesson) => {
                    setCurrentLesson(lesson);
                    setCurrentSubject(subject);
                    setModals(m => ({ ...m, editLesson: true }));
                  }}
                  onDeleteLesson={(lessonId) => {
                    // Add lesson deletion logic
                  }}
                  onAssignTeacher={() => {
                    setCurrentSubject(subject);
                    setModals(m => ({ ...m, assignTeacher: true }));
                  }}
                  onRemoveTeacher={(teacherId) => handleRemoveTeacher(teacherId, subject.id)}
                />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <Book className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No subjects found</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? "No subjects match your search criteria" 
                : "Get started by adding your first subject"}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Subject Modal */}
      <Modal
        isOpen={modals.addSubject || modals.editSubject}
        onClose={() => setModals(m => ({ ...m, addSubject: false, editSubject: false }))}
        title={currentSubject ? 'Edit Subject' : 'Add New Subject'}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={currentSubject?.name || ''}
              onChange={(e) => setCurrentSubject(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={currentSubject?.description || ''}
              onChange={(e) => setCurrentSubject(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter subject description"
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setModals(m => ({ ...m, addSubject: false, editSubject: false }))}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={() => currentSubject?.id ? handleEditSubject(currentSubject) : handleAddSubject(currentSubject)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  {currentSubject?.id ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Plus size={18} />
                  {currentSubject?.id ? 'Save Changes' : 'Add Subject'}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Lesson Modal */}
      <Modal
        isOpen={modals.addLesson || modals.editLesson}
        onClose={() => setModals(m => ({ ...m, addLesson: false, editLesson: false }))}
        title={currentLesson ? 'Edit Lesson' : 'Add New Lesson'}
      >
        <LessonForm
          lesson={currentLesson}
          onSubmit={handleLessonSubmit}
          onClose={() => setModals(m => ({ ...m, addLesson: false, editLesson: false }))}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
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
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Confirm Deletion
            </h4>
            <p className="text-gray-600">
              Are you sure you want to delete this subject? This action cannot be undone and will remove all associated lessons and materials.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={() => setModals(m => ({ ...m, deleteConfirm: false }))}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteSubject}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            disabled={isSubmitting}
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

      {/* Assign Teacher Modal */}
      <Modal
        isOpen={modals.assignTeacher}
        onClose={() => setModals(m => ({ ...m, assignTeacher: false }))}
        title="Assign Teacher"
      >
        <div className="space-y-6">
          <FormControl fullWidth>
            <InputLabel>Select Teacher</InputLabel>
            <Select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              label="Select Teacher"
            >
              {teachers
                .filter(teacher => !currentSubject?.teacherIds?.includes(teacher.id))
                .map(teacher => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        {teacher.name.charAt(0)}
                      </div>
                      <span>{teacher.name}</span>
                    </div>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setModals(m => ({ ...m, assignTeacher: false }))}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleAssignTeacher}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting || !selectedTeacher}
            >
              {isSubmitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Assign Teacher
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubjectsScreen;