 // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

   import { getAuth } from"https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
   import { getFirestore } from"https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC1eJrxsFwL58A_IVR0u9tkdZ-H3pvBGP0",
    authDomain: "social-media-app-4efaa.firebaseapp.com",
    projectId: "social-media-app-4efaa",
    storageBucket: "social-media-app-4efaa.firebasestorage.app",
    messagingSenderId: "477137724651",
    appId: "1:477137724651:web:f51481bf6755f036c9caae"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);


  const auth = getAuth(app);
const db = getFirestore(app);


export { app, auth, db };