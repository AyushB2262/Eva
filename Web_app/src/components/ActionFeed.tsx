import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe } from 'lucide-react';

interface ActionFeedProps {
  activeTask: { id: string, message: string } | null;
}

export default function ActionFeed({ activeTask }: ActionFeedProps) {
  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {activeTask && (
          <motion.div
            key={activeTask.id} // Re-animate if new task comes in
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          >
            <div className="relative flex items-center justify-center">
                <Globe className="text-zinc-400" size={18} />
                <div className="absolute inset-0 border-t-2 border-yellow-500 rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-zinc-200 tracking-wide">
              {activeTask.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
