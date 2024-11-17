import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Book,
    ChevronRight,
    Edit3,
    GraduationCap,
    Home,
    Loader,
    Plus,
    School,
    Search,
    Trash2,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../../firebase/firebaseConfig';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  hover: { 
    y: -5,
    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)",
    transition: { duration: 0.2 }
  }
};

const MotionCard = motion.div;

const LevelCard = ({ level, subjectsCount, onEdit, onDelete, onAddSubject, navigate }) => (
  <MotionCard
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover="hover"
    className="relative bg-white rounded-xl overflow-hidden border border-blue-100/40 shadow-lg shadow-blue-100/50 cursor-pointer"
    onClick={() => navigate(`/subjects/${level.id}`)}
  >
    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
    
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {level.name}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-2">
          {level.description || "No description provided"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mb-2">
            <Book size={16} className="text-blue-600" />
          </div>
          <span className="text-lg font-semibold text-blue-600">
            {subjectsCount[level.id]?.subjects || 0}
          </span>
          <span className="text-xs text-blue-600/70">Subjects</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-indigo-50 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full mb-2">
            <Users size={16} className="text-indigo-600" />
          </div>
          <span className="text-lg font-semibold text-indigo-600">
            {subjectsCount[level.id]?.teachers || 0}
          </span>
          <span className="text-xs text-indigo-600/70">Teachers</span>
        </div>
        
        <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mb-2">
            <GraduationCap size={16} className="text-purple-600" />
          </div>
          <span className="text-lg font-semibold text-purple-600">
            {subjectsCount[level.id]?.students || 0}
          </span>
          <span className="text-xs text-purple-600/70">Students</span>
        </div>
      </div>

      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onEdit(level)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        >
          <Edit3 size={18} />
        </button>
        <button
          onClick={() => onDelete(level.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 size={18} />
        </button>
        <button
          onClick={() => onAddSubject(level.id)}
          className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  </MotionCard>
);

const Modal = ({ isOpen, onClose, title, children, footer, className = "" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`bg-white rounded-xl shadow-xl max-w-lg w-full ${className}`}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const LevelsScreen = () => {
  const navigate = useNavigate();
  const { schoolId: urlSchoolId } = useParams();
  const [levels, setLevels] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(urlSchoolId || '');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectsCount, setSubjectsCount] = useState({});
  const [modals, setModals] = useState({
    add: false,
    edit: false,
    delete: false,
    addSubject: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    level: { name: '', description: '' },
    subject: { name: '', description: '', levelId: '' }
  });
  const [selectedLevelId, setSelectedLevelId] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'schools'),
      (snapshot) => {
        const schoolsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setSchools(schoolsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching schools:', error);
        toast.error('Failed to fetch schools');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setLevels([]);
      setSubjectsCount({});
      return;
    }

    setLoading(true);
    const levelsQuery = query(
      collection(db, 'levels'),
      where('schoolId', '==', selectedSchool)
    );

    const unsubscribe = onSnapshot(
      levelsQuery,
      (snapshot) => {
        const levelsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setLevels(levelsData);
        setLoading(false);
        fetchCounts(levelsData);
      },
      (error) => {
        console.error('Error fetching levels:', error);
        toast.error('Failed to fetch levels');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedSchool]);

  const fetchCounts = async (levels) => {
    const counts = {};
    
    for (const level of levels) {
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('levelId', '==', level.id)
      );
      const usersQuery = query(collection(db, 'users'));

      try {
        const [subjectsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(subjectsQuery),
          getDocs(usersQuery)
        ]);

        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        counts[level.id] = {
          subjects: subjectsSnapshot.size,
          teachers: users.filter(user => 
            user.role === 'staff' && user.subjects?.[level.id]?.length > 0
          ).length,
          students: users.filter(user => 
            user.role === 'student' && user.levelId === level.id
          ).length
        };
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    }

    setSubjectsCount(counts);
  };

  const handleSubmit = async (type) => {
    setIsSubmitting(true);
    try {
      if (type === 'add-level') {
        await addDoc(collection(db, 'levels'), {
          ...formData.level,
          schoolId: selectedSchool,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Level added successfully');
      } else if (type === 'edit-level') {
        await updateDoc(doc(db, 'levels', selectedLevelId), {
          ...formData.level,
          updatedAt: serverTimestamp(),
        });
        toast.success('Level updated successfully');
      } else if (type === 'add-subject') {
        await addDoc(collection(db, 'subjects'), {
          ...formData.subject,
          levelId: selectedLevelId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Subject added successfully');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Failed to ${type.replace('-', ' ')}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'levels', selectedLevelId));
      toast.success('Level deleted successfully');
      handleCloseModal();
    } catch (error) {
      console.error('Error deleting level:', error);
      toast.error('Failed to delete level');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModals({
      add: false,
      edit: false,
      delete: false,
      addSubject: false
    });
    setFormData({
      level: { name: '', description: '' },
      subject: { name: '', description: '', levelId: '' }
    });
    setSelectedLevelId(null);
  };

  const filteredLevels = levels.filter(level =>
    level.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <nav className="flex items-center space-x-2 mb-8 text-sm">
        <button 
          onClick={() => navigate('/')}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Home size={18} />
        </button>
        <ChevronRight size={16} className="text-gray-400" />
        <button 
          onClick={() => navigate('/schools')}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
        >
          <School size={18} />
          <span>Schools</span>
        </button>
        <ChevronRight size={16} className="text-gray-400" />
        <span className="text-gray-600">Levels</span>
      </nav>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            School Levels Management
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full md:w-64 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>

            {selectedSchool && (
              <button
                onClick={() => {
                  setModals(m => ({ ...m, add: true }));
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Plus size={18} />
                Add Level
              </button>
            )}
          </div>
        </div>

        {selectedSchool && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search levels..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading levels...</p>
          </div>
        ) : selectedSchool ? (
          filteredLevels.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLevels.map((level) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  subjectsCount={subjectsCount}
                  navigate={navigate}
                  onEdit={(level) => {
                    setSelectedLevelId(level.id);
                    setFormData(fd => ({
                      ...fd,
                      level: { name: level.name, description: level.description }
                    }));
                    setModals(m => ({ ...m, edit: true }));
                  }}
                  onDelete={(levelId) => {
                    setSelectedLevelId(levelId);
                    setModals(m => ({ ...m, delete: true }));
                  }}
                  onAddSubject={(levelId) => {
                    setSelectedLevelId(levelId);
                    setModals(m => ({ ...m, addSubject: true }));
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl">
              <School className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No levels found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search.' : 'Create your first level!'}
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <School className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a School</h3>
            <p className="text-gray-500">Choose a school to view and manage its levels</p>
          </div>
        )}
      </div>

      {/* Add Level Modal */}
      <Modal
        isOpen={modals.add}
        onClose={handleCloseModal}
        title="Add New Level"
        footer={(
          <div className="flex justify-end gap-4">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('add-level')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
              {isSubmitting ? 'Adding...' : 'Add Level'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level Name
            </label>
            <input
              type="text"
              value={formData.level.name}
              onChange={(e) => setFormData(fd => ({
                ...fd,
                level: { ...fd.level, name: e.target.value }
              }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter level name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.level.description}
              onChange={(e) => setFormData(fd => ({
                ...fd,
                level: { ...fd.level, description: e.target.value }
              }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter level description"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Level Modal */}
      <Modal
        isOpen={modals.edit}
        onClose={handleCloseModal}
        title="Edit Level"
        footer={(
          <div className="flex justify-end gap-4">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('edit-level')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Edit3 size={16} />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level Name
            </label>
            <input
              type="text"
              value={formData.level.name}
              onChange={(e) => setFormData(fd => ({
                ...fd,
                level: { ...fd.level, name: e.target.value }
              }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.level.description}
              onChange={(e) => setFormData(fd => ({
                ...fd,
                level: { ...fd.level, description: e.target.value }
              }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modals.delete}
        onClose={handleCloseModal}
        title="Delete Level"
        className="max-w-md"
        footer={(
          <div className="flex justify-end gap-4">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {isSubmitting ? 'Deleting...' : 'Delete Level'}
            </button>
          </div>
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-gray-600">
              Are you sure you want to delete this level? This action cannot be undone and will remove all associated data.
            </p>
          </div>
        </div>
      </Modal>

      {/* Add Subject Modal */}
      <Modal
        isOpen={modals.addSubject}
        onClose={handleCloseModal}
        title="Add New Subject"
        footer={(
          <div className="flex justify-end gap-4">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('add-subject')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
              {isSubmitting ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              value={formData.subject.name}
              onChange={(e) => setFormData(fd => ({
                ...fd,
                subject: { ...fd.subject, name: e.target.value }
              }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.subject.description}
              onChange={(e) => setFormData(fd => ({
                ...fd,
                subject: { ...fd.subject, description: e.target.value }
              }))}
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter subject description"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LevelsScreen;