import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Mage Icons - Selected Council
import magePurple from "../assets/mage_purple.png";
import mageRed from "../assets/mage_red.png";
import mageOrange from "../assets/mage_orange.png";
import mageDarkGray from "../assets/mage_dark_gray.png";

const MAGE_THEMES = [
  { id: "purple", icon: magePurple },
  { id: "red", icon: mageRed },
  { id: "orange", icon: mageOrange },
  { id: "dark_gray", icon: mageDarkGray },
];

function MageSwitcher({ currentTheme, onThemeChange }) {
  const [isMageSplashOpen, setIsMageSplashOpen] = useState(false);

  const currentMageIcon = useMemo(() => {
    return MAGE_THEMES.find((t) => t.id === currentTheme)?.icon || MAGE_THEMES[0].icon;
  }, [currentTheme]);

  return (
    <div className="mage-presence-container">
      <AnimatePresence>
        {isMageSplashOpen && (
          <motion.div
            className="mage-splash-overlay"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
          >
            {MAGE_THEMES.map((theme) => (
              <div
                key={theme.id}
                className={`mage-option ${currentTheme === theme.id ? "active" : ""}`}
                onClick={() => {
                  onThemeChange(theme.id);
                  setIsMageSplashOpen(false);
                }}
              >
                <img src={theme.icon} alt={`${theme.id} mage`} />
              </div>
            ))}
          </motion.div>
        )}
        <img
          src={currentMageIcon}
          alt="Council Logo"
          className="editor-logo"
          onClick={() => setIsMageSplashOpen(!isMageSplashOpen)}
        />
      </AnimatePresence>
      {/* Click-outside overlay to close mage splash */}
      {isMageSplashOpen && (
        <div
          className="mage-splash-backdrop"
          onClick={() => setIsMageSplashOpen(false)}
        />
      )}
    </div>
  );
}

export default MageSwitcher;
