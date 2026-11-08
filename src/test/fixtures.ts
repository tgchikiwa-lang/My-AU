import type { Store } from "@/lib/store";

export const initial: Store = {
  profile: {
    name: "Tadiwa Moyo",
    studentId: "AU-2023-04817",
    programme: "BSc Computer Information Systems",
    faculty: "Computing & Social Sciences",
    year: "Year 2",
    email: "tadiwa.moyo@africau.edu",
    phone: "+263 77 123 4567",
    address: "Fairview Road, Mutare, Zimbabwe",
    dob: "2004-03-14",
    nationality: "Zimbabwean",
    languages: "English, Shona",
    photo: "",
    bio: "Computer Information Systems student passionate about web technologies and building tools that help communities.",
    github: "",
    linkedin: "",
    cvFile: "",
    cvFileName: "",
    cgpa: "",
    graduated: false,
  },
  results: [],
  skills: [
    { id: "skill-1", name: "HTML & CSS", level: "Advanced" },
    { id: "skill-2", name: "JavaScript", level: "Intermediate" },
    { id: "skill-3", name: "Python", level: "Intermediate" },
    { id: "skill-4", name: "Public Speaking", level: "Beginner" },
  ],
  projects: [
    {
      id: "project-1",
      title: "Student Profile System",
      description: "Responsive student dashboard for CIS2103.",
      tech: "HTML, CSS, JavaScript",
      github: "",
    },
  ],
  certificates: [
    { id: "certificate-1", title: "Responsive Web Design", issuer: "freeCodeCamp", date: "2025-06" },
  ],
  academic: [
    {
      id: "academic-1",
      institution: "Africa University",
      qualification: "BSc Computer Information Systems",
      years: "2023 – present",
      result: "In progress",
    },
    {
      id: "academic-2",
      institution: "Hillcrest College",
      qualification: "A Level",
      years: "2020 – 2022",
      result: "15 points",
    },
  ],
  achievements: [
    {
      id: "achievement-1",
      title: "Dean's List",
      year: "2024",
      description: "Top 10% of the faculty for the academic year.",
      categories: [],
      date: "",
      evidence: "",
    },
  ],
  clubs: [
    {
      id: "club-1",
      name: "Computer Science Society",
      type: "Association",
      role: "Member",
      photos: [],
    },
  ],
};
