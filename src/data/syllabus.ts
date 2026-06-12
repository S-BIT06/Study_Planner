import type { ProfessionalYear, SyllabusTopic } from '../types';

const SOURCE = 'Compact demonstration data — replace with verified NCISM import';

export const syllabusTopics: SyllabusTopic[] = [
  {
    id: 'y1-rs-01', year: 'I Professional', subject: 'Rachana Sharir', paper: 'Paper I', unit: 'Foundations',
    title: 'Anatomical terminology and body organization', type: 'Theory', estimatedMinutes: 90,
    difficulty: 'Medium', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y1-rs-02', year: 'I Professional', subject: 'Rachana Sharir', paper: 'Paper I', unit: 'Skeletal study',
    title: 'Upper-limb bones and major landmarks', type: 'Practical', estimatedMinutes: 120,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y1-rs-03', year: 'I Professional', subject: 'Rachana Sharir', paper: 'Paper II', unit: 'Regional anatomy',
    title: 'Thorax: regions, relations and applied overview', type: 'Theory', estimatedMinutes: 150,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y1-ks-01', year: 'I Professional', subject: 'Kriya Sharir', paper: 'Paper I', unit: 'Physiological principles',
    title: 'Homeostasis and functional organization', type: 'Theory', estimatedMinutes: 90,
    difficulty: 'Medium', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y1-ks-02', year: 'I Professional', subject: 'Kriya Sharir', paper: 'Paper I', unit: 'Body systems',
    title: 'Blood components and functional assessment', type: 'Practical', estimatedMinutes: 120,
    difficulty: 'Medium', importance: 'Important', sourceLabel: SOURCE
  },
  {
    id: 'y1-pv-01', year: 'I Professional', subject: 'Padartha Vijnana', paper: 'Paper I', unit: 'Core concepts',
    title: 'Foundational categories and their relationships', type: 'Theory', estimatedMinutes: 120,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y1-sa-01', year: 'I Professional', subject: 'Samhita Adhyayana', paper: 'Paper I', unit: 'Text study',
    title: 'Structured reading and interpretation of selected passages', type: 'Theory', estimatedMinutes: 100,
    difficulty: 'Medium', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y1-sa-02', year: 'I Professional', subject: 'Samhita Adhyayana', paper: 'Paper I', unit: 'Learning activity',
    title: 'Terminology journal and guided reflection', type: 'Journal', estimatedMinutes: 60,
    difficulty: 'Low', importance: 'Supporting', sourceLabel: SOURCE
  },
  {
    id: 'y2-dg-01', year: 'II Professional', subject: 'Dravyaguna Vigyana', paper: 'Paper I', unit: 'Identification',
    title: 'Drug identification principles and classification', type: 'Theory', estimatedMinutes: 120,
    difficulty: 'Medium', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y2-dg-02', year: 'II Professional', subject: 'Dravyaguna Vigyana', paper: 'Paper II', unit: 'Practical record',
    title: 'Specimen observation and record-book entry', type: 'Practical', estimatedMinutes: 90,
    difficulty: 'Medium', importance: 'Important', sourceLabel: SOURCE
  },
  {
    id: 'y2-rn-01', year: 'II Professional', subject: 'Roga Nidana', paper: 'Paper I', unit: 'Diagnostic foundations',
    title: 'Approach to signs, symptoms and examination', type: 'Clinical', estimatedMinutes: 150,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y2-sw-01', year: 'II Professional', subject: 'Swasthavritta and Yoga', paper: 'Paper I', unit: 'Preventive care',
    title: 'Daily regimen and health-promotion planning', type: 'Activity', estimatedMinutes: 90,
    difficulty: 'Low', importance: 'Important', sourceLabel: SOURCE
  },
  {
    id: 'y3-kc-01', year: 'III Professional', subject: 'Kayachikitsa', paper: 'Paper I', unit: 'Clinical approach',
    title: 'Case assessment and treatment-planning framework', type: 'Clinical', estimatedMinutes: 180,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y3-pk-01', year: 'III Professional', subject: 'Panchakarma', paper: 'Paper I', unit: 'Procedural foundations',
    title: 'Indications, preparation and procedural sequence', type: 'Practical', estimatedMinutes: 150,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y3-st-01', year: 'III Professional', subject: 'Shalya Tantra', paper: 'Paper I', unit: 'Surgical foundations',
    title: 'Instrument recognition and basic procedural principles', type: 'Practical', estimatedMinutes: 120,
    difficulty: 'Medium', importance: 'Core', sourceLabel: SOURCE
  },
  {
    id: 'y4-cl-01', year: 'IV Professional', subject: 'Clinical Integration', paper: 'Integrated', unit: 'Case synthesis',
    title: 'Integrated case discussion and management review', type: 'Clinical', estimatedMinutes: 180,
    difficulty: 'High', importance: 'Core', sourceLabel: SOURCE
  }
];

export function topicsForYear(year: ProfessionalYear): SyllabusTopic[] {
  return syllabusTopics.filter((topic) => topic.year === year);
}
