import { motion } from 'framer-motion';
import { SceneLayout, VideoText, MediaFrame } from '@/lib/video/layout';

export function Scene2_Games() {
  return (
    <SceneLayout className="flex items-center relative overflow-hidden px-16">
      
      {/* Background Wipe Transition */}
      <motion.div
        className="absolute inset-0 bg-[#0a0a1a]"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      />
      
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,242,254,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,254,0.1)_1px,transparent_1px)] bg-[size:4vw_4vw] [transform:perspective(500px)_rotateX(60deg)] origin-bottom opacity-30" />

      <div className="flex w-full z-10 items-center justify-between">
        
        {/* Left Side: Typography */}
        <div className="flex flex-col w-1/2">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <VideoText scale="heading" className="font-display font-bold text-white uppercase leading-tight">
              Multiple Games.<br/>
              <span className="text-brand-pink text-glow-pink">One Arena.</span>
            </VideoText>
          </motion.div>

          <motion.div
            className="mt-6 border-l-4 border-brand-cyan pl-6"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <VideoText scale="body" className="font-sans text-text-secondary">
              Discover a universe of competitive titles.
              Featuring the ultimate Ludo experience.
            </VideoText>
          </motion.div>
        </div>

        {/* Right Side: Visuals */}
        <div className="w-1/2 relative h-[80vh] flex justify-center items-center">
          <motion.img
            src={`${import.meta.env.BASE_URL}images/ludo-3d.png`}
            alt="3D Ludo"
            className="w-[40vw] h-auto object-contain drop-shadow-[0_0_40px_rgba(255,8,68,0.5)]"
            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 10, opacity: 1 }}
            exit={{ scale: 1.5, x: 200, opacity: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 80,
              damping: 15,
              delay: 0.6 
            }}
          />
          
          {/* Floating UI Elements */}
          {['LUDO', 'CHESS', 'CARROM'].map((game, i) => (
            <motion.div
              key={game}
              className="absolute bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ delay: 1 + (i * 0.2), duration: 0.5 }}
              style={{
                top: `${20 + i * 25}%`,
                right: `${10 + (i % 2) * 20}%`
              }}
            >
              <VideoText scale="body" className="font-display font-bold tracking-wider text-brand-cyan">
                {game}
              </VideoText>
            </motion.div>
          ))}
        </div>
      </div>
    </SceneLayout>
  );
}
