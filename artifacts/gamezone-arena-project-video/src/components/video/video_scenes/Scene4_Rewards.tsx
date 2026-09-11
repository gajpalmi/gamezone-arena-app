import { motion } from 'framer-motion';
import { SceneLayout, VideoText } from '@/lib/video/layout';

export function Scene4_Rewards() {
  return (
    <SceneLayout className="relative flex items-center px-20">
      
      {/* Dynamic Background Effect */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.15)_0%,transparent_70%)]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1.5, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      <div className="flex w-full items-center justify-between z-10">
        
        {/* Left Side: 3D Coins Image */}
        <div className="w-1/2 relative h-[80vh] flex justify-center items-center">
          <motion.img
            src={`${import.meta.env.BASE_URL}images/coins-3d.png`}
            alt="3D Coins and Rewards"
            className="w-[45vw] h-auto object-contain drop-shadow-[0_0_50px_rgba(255,215,0,0.6)]"
            initial={{ scale: 0, y: 100, rotate: 30 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 1.2, x: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 12, delay: 0.2 }}
          />

          {/* Floating particles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-brand-gold rounded-full shadow-[0_0_10px_#ffd700]"
              initial={{ y: 0, opacity: 0, scale: 0 }}
              animate={{ 
                y: -200 - (Math.random() * 100), 
                x: (Math.random() - 0.5) * 200,
                opacity: [0, 1, 0], 
                scale: [0, 1, 0.5] 
              }}
              transition={{ 
                duration: 2 + Math.random(), 
                repeat: Infinity,
                delay: i * 0.4
              }}
              style={{
                left: '50%',
                top: '50%'
              }}
            />
          ))}
        </div>

        {/* Right Side: Typography */}
        <div className="w-1/2 pl-12 flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, x: 50, skewX: -10 }}
            animate={{ opacity: 1, x: 0, skewX: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
          >
            <VideoText scale="heading" className="font-display font-bold text-white uppercase leading-tight mb-2">
              Unlock <span className="text-brand-gold text-shadow-[0_0_20px_#ffd700]">Maps</span>.
            </VideoText>
            <VideoText scale="heading" className="font-display font-bold text-brand-cyan uppercase leading-tight">
              Earn Rewards.
            </VideoText>
          </motion.div>

          <motion.div
            className="mt-8 flex flex-col gap-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              visible: { transition: { staggerChildren: 0.2, delayChildren: 0.8 } },
              hidden: { transition: { staggerChildren: 0.1, staggerDirection: -1 } }
            }}
          >
            {[
              { text: "Collect Coins Daily", color: "brand-gold" },
              { text: "Exclusive Map Skins", color: "brand-cyan" },
              { text: "Premium Chests", color: "brand-pink" }
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, x: 50 },
                  visible: { opacity: 1, x: 0 }
                }}
                className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-xl backdrop-blur-sm"
              >
                <div className={`w-3 h-3 rounded-full bg-${item.color} shadow-[0_0_10px_currentColor]`} />
                <VideoText scale="body" className="font-sans font-semibold tracking-wide">
                  {item.text}
                </VideoText>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </SceneLayout>
  );
}
