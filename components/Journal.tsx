import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { JournalEntry } from '../types';

// Robust date parser
const toDate = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000); // Plain object timestamp
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

export const Journal: React.FC = () => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [text, setText] = useState('');

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'users', auth.currentUser.uid, 'journal'), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
        });
        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !auth.currentUser) return;
        
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'journal'), {
            text,
            date: Timestamp.now(),
            isPinned: false
        });
        setText('');
    };

    const togglePin = async (entry: JournalEntry) => {
        if (!auth.currentUser) return;
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'journal', entry.id), {
            isPinned: !entry.isPinned
        });
    };

    const deleteEntry = async (id: string) => {
        if (!auth.currentUser || !window.confirm("DELETE ENTRY?")) return;
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'journal', id));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold border-b border-dashed border-neon pb-2">PERSONAL LOGS</h2>
            
            <form onSubmit={handleSubmit} className="mb-8">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="ENTER LOG DATA..."
                    className="w-full h-40 bg-black border border-neon text-neon p-4 font-mono text-lg md:text-xl focus:shadow-[0_0_8px_#27ff47] outline-none resize-none"
                ></textarea>
                <div className="flex justify-end mt-3">
                    <button type="submit" className="w-full md:w-auto border-2 border-neon bg-neon text-black px-8 py-3 font-retro text-base hover:bg-neonHover hover:shadow-[0_0_15px_#27ff47]">
                        UPLOAD ENTRY
                    </button>
                </div>
            </form>

            <div className="space-y-6">
                {entries.map(entry => (
                    <div 
                        key={entry.id} 
                        className={`p-4 md:p-6 bg-panel border ${entry.isPinned ? 'border-l-4 border-l-gold shadow-[-5px_0_10px_rgba(255,215,0,0.1)]' : 'border-neonDim'}`}
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 border-b border-dashed border-gray-800 pb-2 gap-2">
                            <span className="font-mono font-bold text-white text-base md:text-lg">
                                {toDate(entry.date).toLocaleString()} {entry.isPinned && '📌'}
                            </span>
                            <div className="flex gap-4 self-end md:self-auto">
                                <button onClick={() => togglePin(entry)} className="text-xs md:text-sm text-gold hover:underline font-bold">
                                    {entry.isPinned ? 'UNPIN' : 'PIN'}
                                </button>
                                <button onClick={() => deleteEntry(entry.id)} className="text-xs md:text-sm text-error hover:underline font-bold">
                                    DELETE
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg md:text-xl">{entry.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};