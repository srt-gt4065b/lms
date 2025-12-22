// 파일 경로: src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // 👇 여기를 본인의 설정값으로 꼭 바꿔주세요!
  apiKey: "AIzaSyBYPX-yqCPEXYzy65LISvPjWv1sg8QRDTc",
  authDomain: "lecture-mgmt.firebaseapp.com",
  projectId: "lecture-mgmt",
  storageBucket: "lecture-mgmt.firebasestorage.app",
  messagingSenderId: "260491040072",
  appId: "1:260491040072:web:25dc02477e1170e27ecf7d",
  measurementId: "G-MG9919WWL4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);