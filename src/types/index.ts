export interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
  role: string;
  company: string;
  period: string;
  description: string;
  skills: string[];
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  achievements: string[];
}