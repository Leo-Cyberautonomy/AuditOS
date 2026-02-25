"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  accentColor?: string;  // left border color, default #D97706
  delay?: number;
}

export function KPICard({ title, value, unit, icon: Icon, accentColor = "#D97706", delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-xl p-5 flex flex-col gap-2"
      style={{
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: accentColor + "1A" }}
        >
          <Icon size={16} style={{ color: accentColor }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{unit}</p>
      </div>
    </motion.div>
  );
}
