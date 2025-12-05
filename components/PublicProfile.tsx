import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
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
            const linkId = params.get('u'); // Could be UID or Username

            if (!linkId) {
                setError("INVALID LINK");
                setLoading(false);
                return;
            }

            try {
                // 1. Ensure Auth State (Wait for initialization to prevent race conditions)
                const user = await new Promise<User | null>((resolve) => {
                    // Check if already initialized
                    if (auth.currentUser) {
                        resolve(auth.currentUser);
                    } else {
                        const unsub = onAuthStateChanged(auth, (u) => {
                            unsub();
                            resolve(u);
                        });
                    }
                });

                if (!user) {
                    await signInAnonymously(auth);
                }

                // 2. Resolve User ID (Check UID first, then Username)
                let targetUid = linkId;
                let data: UserProfile | undefined;

                // Try fetching as direct UID
                const userSnap = await getDoc(doc(db, 'users', linkId));
                
                if (userSnap.exists()) {
                    data = userSnap.data() as UserProfile;
                } else {
                    // Try fetching by username
                    // Note: This requires a query. If not unique, it takes the first match.
                    const q = query(collection(db, 'users'), where('username', '==', linkId));
                    const querySnap = await getDocs(q);
                    
                    if (!querySnap.empty) {
                        const match = querySnap.docs[0];
                        targetUid = match.id;
                        data = match.data() as UserProfile;
                    }
                }

                if (!data) {
                    setError("USER NOT FOUND");
                    setLoading(false);
                    return;
                }

                if (!data.publicProfile?.enabled) {
                    setError("PROFILE IS PRIVATE");
                    setLoading(false);
                    return;
                }

                setUserData(data);

                // 3. Fetch Logs (if public visibility allows)
                if (data.publicProfile.showStats || data.publicProfile.showCalendar || data.publicProfile.showAwards) {
                    const qLogs = query(collection(db, 'users', targetUid, 'logs'), orderBy('startDate', 'desc'));
                    const logsSnap = await getDocs(qLogs);
                    const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StreakLog));
                    setLogs(logsData);
                }

                setLoading(false);
            } catch (err: any) {
                console.error("Public Profile Error:", err);
                let msg = "ACCESS DENIED";
                if (err.code === 'permission-denied') msg = "PERMISSION DENIED (CHECK RULES)";
                setError(msg);
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