"use client";

import { motion } from "framer-motion";
import { Building2, Calendar, Briefcase } from "lucide-react";

interface ReferenceCardProps {
  client: string;
  period: string;
  role: string;
  focus: string;
  index: number;
}

export function ReferenceCard({ client, period, role, focus, index }: ReferenceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Building2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <h3 className="text-lg font-bold text-gray-900 leading-normal">{client}</h3>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>{period}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Briefcase className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 font-medium">{role}</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed ml-6">{focus}</p>
        </div>
      </div>
    </motion.div>
  );
}
