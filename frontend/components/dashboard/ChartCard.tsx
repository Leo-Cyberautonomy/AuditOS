"use client";
import { forwardRef } from "react";
import { motion } from "framer-motion";

interface ChartCardProps {
  id: string;
  title: string;
  selected: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  delay?: number;
}

export const ChartCard = forwardRef<HTMLDivElement, ChartCardProps>(
  function ChartCard({ id, title, selected, onToggle, children, delay = 0 }, ref) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="bg-white rounded-xl relative group"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {/* Chart content ref target — pr-9 keeps content clear of the checkbox */}
        <div ref={ref} className="p-5 pr-9">
          {children}
        </div>
        {/* Selection checkbox — top right corner */}
        <button
          onClick={() => onToggle(id)}
          className="absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center transition-all"
          style={{
            backgroundColor: selected ? "#D97706" : "#F3F4F6",
            border: selected ? "none" : "1.5px solid #D1D5DB",
          }}
          title={selected ? "Abwählen" : "Für Export auswählen"}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </motion.div>
    );
  }
);
