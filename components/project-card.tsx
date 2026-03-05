"use client";

import { motion } from "framer-motion";
import { Building2, Calendar, User, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  title: string;
  client: string;
  period: string;
  role: string;
  objective: string;
  highlights: string[];
  technologies: string[];
  index: number;
}

export function ProjectCard({
  title,
  client,
  period,
  role,
  objective,
  highlights,
  technologies,
  index,
}: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100"
    >
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>

        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{client}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{period}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
          <p className="text-sm text-gray-600 leading-relaxed">{role}</p>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{objective}</p>

        {highlights && highlights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Highlights
            </div>
            <ul className="space-y-1 ml-6">
              {highlights.slice(0, 2).map((highlight, i) => (
                <li key={i} className="text-sm text-gray-600 list-disc line-clamp-1">
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {technologies && technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {technologies.slice(0, 5).map((tech, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs"
              >
                {tech}
              </Badge>
            ))}
            {technologies.length > 5 && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                +{technologies.length - 5}
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
