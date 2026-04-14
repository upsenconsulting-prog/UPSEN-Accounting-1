// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBm55gmn-NOPqMiIoYZKaTtYD8VHur1wqM",
  authDomain: "erasmus-c4a21.firebaseapp.com",
  projectId: "erasmus-c4a21",
  storageBucket: "erasmus-c4a21.firebasestorage.app",
  messagingSenderId: "83551682410",
  appId: "1:83551682410:web:0c4594077a7bb105b1ef13",
  measurementId: "G-RBGP10043G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);  // doar db
