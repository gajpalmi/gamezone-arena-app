import { motion } from 'framer-motion';
import { SceneLayout, VideoText } from '@/lib/video/layout';

export function Scene1_Hero() {
  return (
    <SceneLayout className="flex flex-col items-center justify-center relative">
      {/* Background Accent Gradients */}
      <motion.div
        className="absolute w-[60vw] h-[60vw] rounded-full bg-brand-cyan/20 blur-[100px]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.div
        className="absolute w-[50vw] h-[50vw] rounded-full bg-brand-pink/20 blur-[100px] ml-[20vw]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
      />

      <div className="z-10 flex flex-col items-center">
        <motion.img
          src={`${import.meta.env.BASE_URL}images/icon.png`}
          alt="Gamezone Arena Logo"
          className="w-[20vw] h-[20vw] rounded-3xl glow-cyan mb-8"
          initial={{ scale: 0, rotateY: 90, opacity: 0 }}
          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0, filter: "blur(20px)" }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 20,
            duration: 1.2
          }}
        />

        <motion.div
          initial={{ y: 50, opacity: 0, clipPath: "inset(100% 0 0 0)" }}
          animate={{ y: 0, opacity: 1, clipPath: "inset(0% 0 0 0)" }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <VideoText
            scale="display"
            className="font-display font-bold text-white tracking-widest uppercase mb-2 text-glow"
          >
            Gamezone Arena
          </VideoText>
        </motion.div>

        <motion.div
          className="flex gap-4 items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="h-[2px] w-16 bg-brand-cyan" />
          <VideoText scale="body" className="font-sans font-semibold text-brand-cyan tracking-[0.2em] uppercase">
            Release 1.0.3
          </VideoText>
          <div className="h-[2px] w-16 bg-brand-cyan" />
        </motion.div>
      </div>
    </SceneLayout>
  );
}
