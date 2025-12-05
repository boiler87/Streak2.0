import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { UserProfile } from '../types';

interface ProfileProps {
    userData: UserProfile;
}

export const Profile: React.FC<ProfileProps> = ({ userData }) => {
    const [newName, setNewName] = useState(userData.username || '');
    const [msg, setMsg] = useState('');

    const handleUpdateName = async () => {
        if (!auth.currentUser) return;
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), { username: newName });
            setMsg('IDENTITY UPDATED');
        } catch (e) {
            setMsg('ERROR UPDATING');
        }
    };

    const togglePublicProfile = async (enabled: boolean) => {
        if (!auth.currentUser) return;
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { 'publicProfile.enabled': enabled });
    };

    const toggleSetting = async (key: keyof NonNullable<UserProfile['publicProfile']>) => {
        if (!auth.currentUser) return;
        const currentSettings = userData.publicProfile || { enabled: false, showStats: false, showAwards: false, showCalendar: false };
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { 
            [`publicProfile.${key}`]: !currentSettings[key] 
        });
    };

    const publicUrl = `${window.location.origin}?u=${auth.currentUser?.uid}`;

    const copyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setMsg('LINK COPIED TO CLIPBOARD');
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold border-b border-dashed border-neon pb-2">USER SETTINGS</h2>

            {/* Identity */}
            <div className="p-6 bg-panel border border-neonDim">
                <h3 className="text-xl text-neon font-retro mb-4">IDENTITY</h3>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="SET CALLSIGN"
                        className="flex-grow bg-black border border-neon text-white p-3 text-lg outline-none"
                    />
                    <button onClick={handleUpdateName} className="bg-neon text-black px-6 py-3 font-bold hover:bg-white transition-colors">
                        UPDATE
                    </button>
                </div>
                <p className="text-gray-500 font-mono text-sm">UID: {auth.currentUser?.uid}</p>
                {msg && <p className="text-neon mt-2 animate-pulse">{msg}</p>}
            </div>

            {/* Public Profile */}
            <div className="p-6 bg-panel border border-neonDim">
                <h3 className="text-xl text-neon font-retro mb-4">PUBLIC PROFILE BROADCAST</h3>
                
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                    <span className="text-white text-lg font-bold">ENABLE PUBLIC LINK</span>
                    <button 
                        onClick={() => togglePublicProfile(!userData.publicProfile?.enabled)}
                        className={`w-14 h-8 rounded-full p-1 transition-colors ${userData.publicProfile?.enabled ? 'bg-neon' : 'bg-gray-700'}`}
                    >
                        <div className={`w-6 h-6 bg-black rounded-full shadow-md transform transition-transform ${userData.publicProfile?.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {userData.publicProfile?.enabled && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label className="text-gray-400 text-sm mb-2 block">PUBLIC ACCESS LINK</label>
                            <div className="flex gap-2">
                                <input readOnly value={publicUrl} className="flex-grow bg-black border border-gray-700 text-gray-300 p-2 text-sm font-mono" />
                                <button onClick={copyLink} className="border border-neon text-neon px-4 py-2 hover:bg-neon hover:text-black text-sm">COPY</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-white font-bold text-sm">DATA VISIBILITY</h4>
                            {[
                                { k: 'showStats', label: 'SHOW STATS & RANK' },
                                { k: 'showAwards', label: 'SHOW MEDALS' },
                                { k: 'showCalendar', label: 'SHOW ACTIVITY CALENDAR' }
                            ].map(item => (
                                <div key={item.k} className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        checked={!!userData.publicProfile?.[item.k as keyof typeof userData.publicProfile]} 
                                        onChange={() => toggleSetting(item.k as any)}
                                        className="w-5 h-5 accent-neon bg-black border-gray-600"
                                    />
                                    <span className="text-gray-300">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};