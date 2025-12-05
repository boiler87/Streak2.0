import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const handleLogout = () => signOut(auth);

    const NavButton = ({ tab, icon, label }: { tab: string; icon: React.ReactNode; label: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center justify-center w-full py-4 md:py-6 transition-all duration-200 
            ${activeTab === tab ? 'text-neon border-r-0 border-t-4 md:border-t-0 md:border-r-4 border-neon bg-neonDim' : 'text-gray-500 hover:text-white border-transparent'}`}
        >
            <div className={`w-6 h-6 md:w-8 md:h-8 mb-1 md:mb-2 fill-current ${activeTab === tab ? 'drop-shadow-[0_0_8px_rgba(39,255,71,0.8)]' : ''}`}>
                {icon}
            </div>
            <span className="text-xs md:text-sm font-retro tracking-widest">{label}</span>
        </button>
    );

    const Icons = {
        dash: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
        stats: <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z" />,
        awards: <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.74 2.77 3.11 3.5V19H7v2h10v-2h-3.5v-3.56c1.37-.73 2.48-2 3.11-3.5.07-.16.12-.33.18-.5.1-.3.15-.61.15-.93V7c0-1.1-.9-2-2-2zm-7 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />,
        journal: <path d="M18 2H6c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />,
        profile: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    };

    return (
        <div className="flex w-full h-[100dvh] relative z-10 font-mono flex-col md:flex-row overflow-hidden">
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col fixed top-0 left-0 h-full w-24 bg-bgDark border-r-2 border-neon pt-8 z-[60]">
                <NavButton tab="dashboard" icon={<svg viewBox="0 0 24 24">{Icons.dash}</svg>} label="DASH" />
                <NavButton tab="stats" icon={<svg viewBox="0 0 24 24">{Icons.stats}</svg>} label="STATS" />
                <NavButton tab="achievements" icon={<svg viewBox="0 0 24 24">{Icons.awards}</svg>} label="BADGES" />
                <NavButton tab="journal" icon={<svg viewBox="0 0 24 24">{Icons.journal}</svg>} label="LOGS" />
                <NavButton tab="profile" icon={<svg viewBox="0 0 24 24">{Icons.profile}</svg>} label="USER" />
            </nav>

            <main className="flex-grow p-3 md:p-5 md:ml-24 overflow-y-auto pb-24 md:pb-5 h-full">
                <div className="max-w-5xl mx-auto border-2 border-neon shadow-[0_0_15px_rgba(39,255,71,0.2)] bg-bgDark p-3 md:p-6 min-h-[90vh]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b-2 border-neonDim pb-4 gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="h-10 w-10 md:h-14 md:w-14 bg-neon flex items-center justify-center font-retro text-black text-xl md:text-3xl font-bold">S</div>
                            <div>
                                <h2 className="font-retro text-2xl md:text-4xl text-neon drop-shadow-[2px_2px_0px_rgba(39,255,71,0.3)]">STREAKER</h2>
                                <p className="text-xs md:text-sm tracking-widest opacity-80">v3.0.0 REACT_BUILD</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full md:w-auto px-4 py-2 border border-neon text-neon text-sm md:text-base hover:bg-neon hover:text-black transition-colors"
                        >
                            DISCONNECT
                        </button>
                    </div>
                    {children}
                </div>
            </main>

            {/* Mobile Nav - Increased Z-Index to stay above CRT scanlines */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-bgDark border-t-2 border-neon flex justify-around items-center z-[100] shadow-[0_-5px_15px_rgba(0,0,0,0.8)]">
                <button onClick={() => setActiveTab('dashboard')} className={`p-2 ${activeTab === 'dashboard' ? 'text-neon' : 'text-gray-500'}`}><svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">{Icons.dash}</svg></button>
                <button onClick={() => setActiveTab('stats')} className={`p-2 ${activeTab === 'stats' ? 'text-neon' : 'text-gray-500'}`}><svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">{Icons.stats}</svg></button>
                <button onClick={() => setActiveTab('achievements')} className={`p-2 ${activeTab === 'achievements' ? 'text-neon' : 'text-gray-500'}`}><svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">{Icons.awards}</svg></button>
                <button onClick={() => setActiveTab('journal')} className={`p-2 ${activeTab === 'journal' ? 'text-neon' : 'text-gray-500'}`}><svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">{Icons.journal}</svg></button>
                <button onClick={() => setActiveTab('profile')} className={`p-2 ${activeTab === 'profile' ? 'text-neon' : 'text-gray-500'}`}><svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">{Icons.profile}</svg></button>
            </nav>
        </div>
    );
};