import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { Auth } from './components/Auth';
import { Layout } from './components/ui/Layout';
import { Dashboard } from './components/Dashboard';
import { Stats } from './components/Stats';
import { Achievements } from './components/Achievements';
import { Journal } from './components/Journal';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { UserProfile, StreakLog, JournalEntry } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userData, setUserData] = useState<UserProfile>({});
  const [logs, setLogs] = useState<StreakLog[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isPublicView, setIsPublicView] = useState(false);

  useEffect(() => {
    // Check for public profile URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get('u')) {
        setIsPublicView(true);
        setLoading(false);
        return;
    }

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || isPublicView) return;
    
    // Subscribe to User Data
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setUserData(doc.data() as UserProfile || {});
    });

    // Subscribe to Logs
    const qLogs = query(collection(db, 'users', user.uid, 'logs'), orderBy('startDate', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const logsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as StreakLog));
      setLogs(logsData);
    });

    // Subscribe to Journal
    const qJournal = query(collection(db, 'users', user.uid, 'journal'), orderBy('date', 'desc'));
    const unsubJournal = onSnapshot(qJournal, (snap) => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
      setJournalEntries(entries);
    });

    return () => {
      unsubUser();
      unsubLogs();
      unsubJournal();
    };
  }, [user, isPublicView]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bgDark text-neon font-retro relative z-20">
        <h1 className="text-2xl mb-4 animate-pulse">STREAKER_OS</h1>
        <p>INITIALIZING SYSTEM...</p>
      </div>
    );
  }

  if (isPublicView) {
      return <PublicProfile />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard logs={logs} userData={userData} journalEntries={journalEntries} />}
      {activeTab === 'stats' && <Stats logs={logs} userData={userData} />}
      {activeTab === 'achievements' && <Achievements logs={logs} />}
      {activeTab === 'journal' && <Journal />}
      {activeTab === 'profile' && <Profile userData={userData} />}
    </Layout>
  );
}

export default App;