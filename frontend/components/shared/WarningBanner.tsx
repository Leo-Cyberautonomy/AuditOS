"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";

interface WarningBannerProps {
  variant: "warning" | "error" | "info";
  children: ReactNode;
}

const variantConfig = {
  warning: {
    bg: "#FFFBEB",
    border: "#F59E0B",
    text: "#92400E",
    Icon: AlertTriangle,
  },
  error: {
    bg: "#FEF2F2",
    border: "#EF4444",
    text: "#991B1B",
    Icon: AlertTriangle,
  },
  info: {
    bg: "#EFF6FF",
    border: "#3B82F6",
    text: "#1E40AF",
    Icon: Info,
  },
};

export function WarningBanner({ variant, children }: WarningBannerProps) {
  const config = variantConfig[variant];
  const { Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
      style={{
        backgroundColor: config.bg,
        borderLeft: `4px solid ${config.border}`,
        color: config.text,
      }}
    >
      <Icon size={18} className="shrink-0 mt-0.5" style={{ color: config.border }} />
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}
