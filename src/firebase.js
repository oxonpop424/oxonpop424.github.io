// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyB1GLZKZOPeph1nFz55TBRK-yFL0Ts_H2U',
  authDomain: 'q-bank-auth.firebaseapp.com',
  projectId: 'q-bank-auth',
  storageBucket: 'q-bank-auth.firebasestorage.app',
  messagingSenderId: '621777589974',
  appId: '1:621777589974:web:05d6b42f7933a70c6a5b77',
  measurementId: 'G-KKJ5KLM18W'  
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
