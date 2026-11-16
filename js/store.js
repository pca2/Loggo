import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js';
import { createDataset } from './data.js';

let db = null;
let docRef = null;

export function initStore(firebaseConfig, secret) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  docRef = doc(db, 'loggo', secret);
}

export async function loadData() {
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  }
  return createDataset();
}

export async function saveData(dataset) {
  await setDoc(docRef, dataset);
}
