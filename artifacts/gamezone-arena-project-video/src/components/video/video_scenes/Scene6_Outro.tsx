import { motion } from 'framer-motion';
import { SceneLayout, VideoText } from '@/lib/video/layout';

export function Scene6_Outro() {
  return (
    <SceneLayout className="relative flex flex-col items-center justify-center">
      
      {/* Background radial blast */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.2)_0%,transparent_60%)]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 2, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      <motion.div
        className="z-10 flex flex-col items-center"
        initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 1, ease: "backOut" }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/icon.png`}
          alt="Gamezone Arena Logo"
          className="w-[15vw] h-[15vw] rounded-3xl glow-cyan mb-8"
        />

        <VideoText
          scale="display"
          className="font-display font-bold text-white tracking-widest uppercase mb-4 text-glow"
        >
          Gamezone Arena
        </VideoText>

        <motion.div
          className="bg-brand-pink text-white px-12 py-4 rounded-full mt-4"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
        >
          <VideoText scale="heading" className="font-display font-bold uppercase tracking-wider">
            Play. Connect. Compete.
          </VideoText>
        </motion.div>
      </motion.div>

    </SceneLayout>
  );
}
