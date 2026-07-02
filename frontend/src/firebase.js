import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEOIGmsJUlYIdgpwaTvq6IahVKn-FA2tc",
  authDomain: "online-exam-af230.firebaseapp.com",
  databaseURL: "https://online-exam-af230-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "online-exam-af230",
  storageBucket: "online-exam-af230.firebasestorage.app",
  messagingSenderId: "97258434284",
  appId: "1:97258434284:web:8917c0481fe066c7c77fc9"
};

const app = initializeApp(firebaseConfig);

// Khởi tạo Firebase Authentication
export const auth = getAuth(app);

export default app;