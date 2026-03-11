import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, CalendarDays, Key, X } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onSuccess: (tokenResponse: any, makeDefault: boolean) => void;
  onCancel: () => void;
}

export default function GoogleAuthModal({ isOpen, onSuccess, onCancel }: GoogleAuthModalProps) {
  const [makeDefault, setMakeDefault] = React.useState(false);

  // We explicitly request the scopes we need 
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => onSuccess(tokenResponse, makeDefault),
    onError: () => {
      console.error('Google Login Failed');
      onCancel();
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/youtube.readonly',
    // Implicit flow returns an access_token directly to the client
    flow: 'implicit' 
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative"
          >
            <button 
              onClick={onCancel}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mb-6 relative">
                 <Key className="text-yellow-500" size={28} />
                 <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <div className="p-1.5 bg-zinc-800 rounded-full border border-zinc-700">
                        <CalendarDays className="text-blue-400" size={12} />
                    </div>
                    <div className="p-1.5 bg-zinc-800 rounded-full border border-zinc-700">
                        <Mail className="text-red-400" size={12} />
                    </div>
                 </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-2 text-white">Action Required</h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Eva needs permission to access your separate Google Workspace to complete this action.
              </p>

              <button
                onClick={() => login()}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3 px-6 rounded-xl hover:bg-zinc-200 transition-colors mb-4"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                Connect Google Account
              </button>

              <label className="flex items-center gap-2 cursor-pointer group w-full text-left bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="relative flex items-center justify-center w-5 h-5">
                    <input 
                    type="checkbox" 
                    checked={makeDefault}
                    onChange={(e) => setMakeDefault(e.target.checked)}
                    className="absolute w-full h-full opacity-0 cursor-pointer peer"
                    />
                    <div className="w-full h-full border border-zinc-600 rounded peer-checked:bg-yellow-500 peer-checked:border-yellow-500 transition-colors flex items-center justify-center">
                        <motion.div 
                           initial={false}
                           animate={{ scale: makeDefault ? 1 : 0 }}
                           className="w-2.5 h-2.5 bg-black rounded-sm"
                        />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">Make this my default account</span>
                    <span className="text-[10px] text-zinc-500">Eva won't ask again for 1 hour.</span>
                </div>
              </label>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
