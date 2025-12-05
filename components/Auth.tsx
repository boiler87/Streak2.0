import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export const Auth: React.FC = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        try {
            if (isRegistering) {
                if (pass !== confirmPass) {
                    setError("PASSWORDS DO NOT MATCH");
                    return;
                }
                if (pass.length < 6) {
                    setError("PASSWORD TOO SHORT (MIN 6 CHARS)");
                    return;
                }
                await createUserWithEmailAndPassword(auth, email, pass);
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch (err: any) {
            let msg = err.message;
            if (err.code === 'auth/invalid-credential') msg = "INVALID CREDENTIALS";
            if (err.code === 'auth/email-already-in-use') msg = "EMAIL ALREADY REGISTERED";
            setError("ACCESS DENIED: " + msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bgDark p-4 font-mono relative z-20">
            <div className="w-full max-w-lg border-2 border-neon bg-panel p-2 shadow-[0_0_20px_rgba(39,255,71,0.2)]">
                <div className="bg-neon text-black font-retro text-sm md:text-base text-center py-3 tracking-widest font-bold">
                    {isRegistering ? 'NEW USER REGISTRATION' : 'USER AUTH PROTOCOL'}
                </div>
                <div className="p-6 md:p-10">
                    <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-10 justify-center">
                        <div className="h-12 w-12 md:h-16 md:w-16 bg-neon flex items-center justify-center font-retro text-black font-bold text-2xl md:text-4xl">S</div>
                        <div>
                            <h1 className="font-retro text-2xl md:text-4xl text-neon">STREAKER</h1>
                            <p className="text-xs md:text-base text-neonDim tracking-widest">Satisfied Through Denial</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-neon font-retro text-sm md:text-base mb-3">USER.EMAIL:</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-black border-2 border-neon text-white p-3 md:p-4 text-base md:text-lg outline-none focus:shadow-[0_0_10px_#27ff47] transition-shadow"
                                placeholder="ENTER IDENTIFIER"
                            />
                        </div>
                        <div>
                            <label className="block text-neon font-retro text-sm md:text-base mb-3">USER.PASSWORD:</label>
                            <input 
                                type="password" 
                                required
                                value={pass}
                                onChange={e => setPass(e.target.value)}
                                className="w-full bg-black border-2 border-neon text-white p-3 md:p-4 text-base md:text-lg outline-none focus:shadow-[0_0_10px_#27ff47] transition-shadow"
                                placeholder="ENTER ACCESS CODE"
                            />
                        </div>
                        
                        {isRegistering && (
                            <div>
                                <label className="block text-neon font-retro text-sm md:text-base mb-3">CONFIRM PASSWORD:</label>
                                <input 
                                    type="password" 
                                    required
                                    value={confirmPass}
                                    onChange={e => setConfirmPass(e.target.value)}
                                    className="w-full bg-black border-2 border-neon text-white p-3 md:p-4 text-base md:text-lg outline-none focus:shadow-[0_0_10px_#27ff47] transition-shadow"
                                    placeholder="REPEAT ACCESS CODE"
                                />
                            </div>
                        )}
                        
                        <div className="text-neon text-base md:text-lg pt-2">
                            {'>'} WAITING FOR INPUT<span className="animate-blink font-bold">_</span>
                        </div>

                        {error && <p className="text-error text-center text-sm md:text-base border border-error p-3">{error}</p>}

                        <button 
                            type="submit"
                            className="w-full bg-neon text-black font-retro text-base md:text-lg py-3 md:py-4 hover:bg-neonHover hover:shadow-[0_0_15px_#27ff47] transition-all transform active:translate-y-1"
                        >
                            {isRegistering ? 'INITIALIZE USER' : 'AUTHENTICATE'}
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                            className="text-gray-500 hover:text-white underline text-sm md:text-base"
                        >
                            {isRegistering ? '[ RETURN TO LOGIN ]' : '[ REGISTER NEW USER ]'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};