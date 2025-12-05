import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { UserProfile, StreakLog } from '../types';
import { Stats } from './Stats';
import { Achievements } from './Achievements';

export const PublicProfile: React.FC = () => {
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [logs, setLogs] = useState<StreakLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const params = new URLSearchParams(window.location.search);
            const uid = params.get('u');

            if (!uid) {
                setError("INVALID LINK");
                setLoading(false);
                return;
            }

            try {
                // Ensure auth for Firestore rules
                if (!auth.currentUser) await signInAnonymously(auth);

                const userSnap = await getDoc(doc(db, 'users', uid));
                if (!userSnap.exists()) {
                    setError("USER NOT FOUND");
                    setLoading(false);
                    return;
                }

                const data = userSnap.data() as UserProfile;
                if (!data.publicProfile?.enabled) {
                    setError("PROFILE IS PRIVATE");
                    setLoading(false);
                    return;
                }

                setUserData(data);

                // Fetch logs if needed for stats/calendar/awards
                const q = query(collection(db, 'users', uid, 'logs'), orderBy('startDate', 'desc'));
                const logsSnap = await getDocs(q);
                const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StreakLog));
                setLogs(logsData);

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("ACCESS DENIED");
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-bgDark flex items-center justify-center text-neon font-retro">
            ACCESSING PUBLIC DATA...
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-bgDark flex flex-col items-center justify-center text-error font-retro p-4 text-center">
            <h1 className="text-3xl mb-4">ERROR 403</h1>
            <p>{error}</p>
            <a href="/" className="mt-8 border border-neon text-neon px-6 py-3 hover:bg-neon hover:text-black transition-colors">
                RETURN TO MAIN SYSTEM
            </a>
        </div>
    );

    return (
        <div className="min-h-screen bg-bgDark p-3 md:p-6 font-mono text-neon">
            <div className="max-w-5xl mx-auto border-2 border-neon shadow-[0_0_20px_rgba(39,255,71,0.2)] bg-bgDark p-4 md:p-8">
                <div className="flex justify-between items-center border-b-2 border-neon pb-6 mb-8">
                    <div>
                        <h2 className="font-retro text-2xl md:text-4xl text-white mb-2">PUBLIC PROFILE</h2>
                        <p className="text-lg text-neonDim tracking-widest">OPERATOR: {userData?.username || 'UNKNOWN'}</p>
                    </div>
                    <a href="/" className="hidden md:block border border-neon text-neon px-4 py-2 hover:bg-neon hover:text-black text-sm">
                        LOGIN / SIGNUP
                    </a>
                </div>

                <div className="space-y-12">
                    {userData?.publicProfile?.showStats && (
                        <Stats logs={logs} userData={userData} />
                    )}

                    {userData?.publicProfile?.showAwards && (
                        <div className="pt-8 border-t border-dashed border-gray-800">
                             <Achievements logs={logs} />
                        </div>
                    )}

                    {!userData?.publicProfile?.showStats && !userData?.publicProfile?.showAwards && !userData?.publicProfile?.showCalendar && (
                        <div className="text-center text-gray-500 py-10 italic">
                            USER HAS HIDDEN ALL DATA DETAILS.
                        </div>
                    )}
                </div>
                
                <div className="mt-12 text-center border-t border-neonDim pt-6 md:hidden">
                     <a href="/" className="block w-full border border-neon text-neon px-4 py-3 hover:bg-neon hover:text-black">
                        LOGIN / SIGNUP
                    </a>
                </div>
            </div>
        </div>
    );
};