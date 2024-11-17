import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore for client

// Your Firebase web app configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqox8xng6oiTOGVpy2vtX3YRbBmrSMNjg",
  authDomain: "virtual-meeting-894ff.firebaseapp.com",
  projectId: "virtual-meeting-894ff",
  storageBucket: "virtual-meeting-894ff.appspot.com",
  messagingSenderId: "1030162276851",
  appId: "1:1030162276851:web:6ee4b999588fc8e4b0b286",
  measurementId: "G-Y08MLH97KR",
};

// Initialize Primary Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Secondary Firebase App for user management
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

export { auth, db, secondaryAuth };
