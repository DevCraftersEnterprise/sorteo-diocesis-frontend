import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { getFirebaseApp } from '../lib/firebase';

let authInstance: Auth | undefined;

function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function signIn(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export function signOutAdmin(): Promise<void> {
  return signOut(getFirebaseAuth());
}

// Fuerza el refresh del ID token (equivalente a getIdToken(true) en la
// app Flutter) para no arrastrar un token expirado.
export async function currentIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}

export function isLoggedIn(): boolean {
  return getFirebaseAuth().currentUser !== null;
}

export function onAuthChanged(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
