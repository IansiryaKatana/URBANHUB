import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import logo from "@/assets/urban-hub-logo.webp";

const Preloader = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsVisible(false), 200);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 80);

    // Shorter max display (800ms) to improve LCP and avoid "No CPU idle period" in Lighthouse
    const maxDisplay = setTimeout(() => setIsVisible(false), 800);
    return () => {
      clearInterval(interval);
      clearTimeout(maxDisplay);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <img src={logo} alt="Urban Hub" className="h-10 w-auto md:h-14" width={160} height={56} fetchPriority="high" />
        </motion.div>

        {/* Progress Bar */}
        <div className="w-64 md:w-80 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#ff2020] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default Preloader;
