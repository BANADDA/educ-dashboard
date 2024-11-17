import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './auth/Login';
import Sidebar from './components/Sidebar';
import StudentManagement from './components/StudentManagement';
import { auth } from './firebase/firebaseConfig';
import Dashboard from './screens/Dashboard';
import ParentManagement from './screens/parent/ParentManagement';
import SchoolsScreen from './screens/schools/schoolDash';
import LevelsScreen from './screens/schools/subjectDash';
import SubjectDetailsScreen from './screens/schools/SubjectDetailsScreen'; // Add this import
import SubjectsScreen from './screens/schools/SubjectsScreen';
import TeachersDataScreen from './screens/teachers/teachers';

const db = getFirestore();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        
        // Fetch user's role from Firestore
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        } else {
          console.error("No user document found in Firestore!");
        }
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUserRole(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 md:ml-16 lg:ml-64">
          <Routes>
            <Route 
              path="/" 
              element={<Dashboard onLogout={handleLogout} userRole={userRole} />} 
            />
            <Route 
              path="/schools" 
              element={
                userRole && ['admin', 'staff'].includes(userRole) ? (
                  <SchoolsScreen userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/schools/:schoolId/levels" 
              element={<LevelsScreen userRole={userRole} />} 
            />
            
            {/* Subjects Routes */}
            <Route 
              path="/subjects/:levelId" 
              element={
                userRole && ['admin', 'staff', 'teacher'].includes(userRole) ? (
                  <SubjectsScreen userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            {/* New Subject Details Route */}
            <Route 
              path="/subjects/:levelId/:subjectId" 
              element={
                userRole && ['admin', 'staff', 'teacher'].includes(userRole) ? (
                  <SubjectDetailsScreen userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            <Route 
              path="/teachers" 
              element={
                userRole && ['admin', 'staff'].includes(userRole) ? (
                  <TeachersDataScreen userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/students" 
              element={
                userRole && ['admin', 'staff'].includes(userRole) ? (
                  <StudentManagement userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/parents" 
              element={
                userRole && ['admin', 'staff'].includes(userRole) ? (
                  <ParentManagement userRole={userRole} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            {/* Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      </div>
    </Router>
  );
}

export default App;