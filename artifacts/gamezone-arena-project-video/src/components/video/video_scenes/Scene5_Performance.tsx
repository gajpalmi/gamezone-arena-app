import { motion } from 'framer-motion';
import { SceneLayout, VideoText } from '@/lib/video/layout';

export function Scene5_Performance() {
  return (
    <SceneLayout className="relative flex flex-col items-center justify-center p-16">
      
      {/* Background Code / Data flow effect */}
      <motion.div 
        className="absolute inset-0 opacity-10 font-mono text-[0.5vw] text-brand-cyan overflow-hidden whitespace-pre pointer-events-none"
        initial={{ y: "100%" }}
        animate={{ y: "-100%" }}
        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
      >
        {Array.from({ length: 50 }).map(() => `
          INITIALIZING... [OK]
          AUTH_MODULE: SEAMLESS_LOGIN_ENABLED
          ADS_SDK: INITIALIZED
          ANDROID_VERSION_CODE: 4
          RELIABILITY_PATCH: APPLIED
          PERFORMANCE_METRICS: OPTIMAL
        `).join('')}
      </motion.div>

      <div className="z-10 w-full max-w-[80vw] bg-black/40 backdrop-blur-md border border-brand-cyan/30 rounded-3xl p-12 relative overflow-hidden">
        
        {/* Scanning Line Effect */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-brand-cyan/50 shadow-[0_0_15px_#00f2fe]"
          initial={{ top: 0 }}
          animate={{ top: "100%" }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
        />

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <VideoText scale="heading" className="font-display font-bold text-white uppercase tracking-widest">
            Engineered for <span className="text-brand-cyan">Speed</span>
          </VideoText>
        </motion.div>

        <div className="grid grid-cols-2 gap-8">
          {[
            { title: "Seamless Login", desc: "Frictionless authentication flow." },
            { title: "Optimized Ads", desc: "Non-intrusive, rewarding ad experience." },
            { title: "Launch Reliability", desc: "Massive stability improvements." },
            { title: "Android 1.0.3", desc: "VersionCode 4. Built for the future." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              className="bg-brand-bg/60 border border-brand-cyan/20 p-6 rounded-xl flex flex-col justify-center items-start"
              initial={{ x: i % 2 === 0 ? -50 : 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, delay: 0.4 + (i * 0.15) }}
            >
              <div className="w-10 h-1 bg-brand-cyan mb-4" />
              <VideoText scale="body" className="font-display font-bold text-white mb-2">
                {feature.title}
              </VideoText>
              <VideoText scale="caption" className="font-sans text-brand-cyan/80">
                {feature.desc}
              </VideoText>
            </motion.div>
          ))}
        </div>
      </div>
    </SceneLayout>
  );
}
