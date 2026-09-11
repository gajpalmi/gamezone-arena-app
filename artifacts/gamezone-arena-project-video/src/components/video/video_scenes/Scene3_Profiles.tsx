import { motion } from 'framer-motion';
import { SceneLayout, VideoText } from '@/lib/video/layout';

export function Scene3_Profiles() {
  return (
    <SceneLayout className="relative flex items-center justify-center overflow-hidden">
      
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/podium-bg.jpg)` }}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ duration: 4.5, ease: "linear" }}
      />
      
      {/* Colored Overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/50 to-transparent" />

      <div className="z-10 flex flex-col items-center w-full max-w-[80vw]">
        
        {/* Top Section: Profiles */}
        <div className="flex gap-8 mb-16 relative">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-[12vw] h-[12vw] rounded-full border-4 border-brand-cyan overflow-hidden bg-brand-bg relative shadow-[0_0_30px_rgba(0,242,254,0.3)]"
              initial={{ scale: 0, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 + (i * 0.1) }}
            >
              {/* Dummy Avatar Graphic */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan to-brand-pink opacity-80" />
              <div className="absolute bottom-0 w-full text-center pb-2">
                <VideoText scale="caption" className="font-display font-bold">PLYR 0{i}</VideoText>
              </div>
            </motion.div>
          ))}
          
          {/* Connection Lines */}
          <motion.div 
            className="absolute top-1/2 left-[12vw] right-[12vw] h-[2px] bg-brand-pink/50 -z-10"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />
        </div>

        <motion.div
          className="text-center mb-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <VideoText scale="heading" className="font-display font-bold uppercase tracking-wide text-brand-cyan mb-2">
            Build your profile. Connect with friends.
          </VideoText>
        </motion.div>

        {/* Bottom Section: Leaderboard */}
        <motion.div
          className="w-[60vw] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          initial={{ y: 100, opacity: 0, rotateX: 45 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: 100, opacity: 0, rotateX: -45 }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
          style={{ perspective: 1000 }}
        >
          <div className="bg-brand-pink/20 py-4 px-8 border-b border-brand-pink/30 flex justify-between">
            <VideoText scale="body" className="font-display font-bold tracking-widest text-brand-pink">
              GLOBAL LEADERBOARD
            </VideoText>
            <VideoText scale="body" className="font-display font-bold">
              RANK 1
            </VideoText>
          </div>
          <div className="p-8">
            <VideoText scale="heading" className="font-sans text-center text-white/80">
              Climb the ranks. Dominate the arena.
            </VideoText>
          </div>
        </motion.div>

      </div>
    </SceneLayout>
  );
}
