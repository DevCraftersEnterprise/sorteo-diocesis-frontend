import { initializeApp, type FirebaseApp } from 'firebase/app';

function buildFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
}

let app: FirebaseApp | undefined;

// Singleton perezoso: initializeApp() no se llama en el import del
// módulo, solo la primera vez que algo pide la app (así el build no
// depende de tener las env vars de Firebase, y queda testeable sin
// mockear efectos secundarios en el import).
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(buildFirebaseConfig());
  }
  return app;
}
