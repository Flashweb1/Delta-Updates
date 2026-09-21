export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyA7pfCiYKlLApq3VIgYPtA4h-xn2xMX5kg',
  authDomain: 'bjlinks-news.firebaseapp.com',
  projectId: 'bjlinks-news',
  storageBucket: 'bjlinks-news.firebasestorage.app',
  messagingSenderId: '1019858531944',
  appId: '1:1019858531944:web:5fae25bdf49cfb90c0eddd',
}

export const isFirebaseConfigured = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)