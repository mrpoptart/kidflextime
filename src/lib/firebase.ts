// Firebase configuration for FlexTime Tracker
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBhhyYtk-it1LofnRmhHUEsuvb7_-9m2CI",
    authDomain: "kidflextime.firebaseapp.com",
    projectId: "kidflextime",
    storageBucket: "kidflextime.firebasestorage.app",
    messagingSenderId: "873728835088",
    appId: "1:873728835088:web:99e189bdb2e58204239495"
};

// Firebase is always configured with hardcoded values
export const isFirebaseConfigured = true;

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };
