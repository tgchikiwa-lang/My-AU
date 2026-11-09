import type { Store } from "./store";

export function createEmptyStore(name = "", email = ""): Store {
  return {
    profile: {
      name,
      studentId: "",
      programme: "",
      faculty: "",
      year: "",
      email,
      phone: "",
      address: "",
      dob: "",
      nationality: "",
      languages: "",
      photo: "",
      bio: "",
      github: "",
      linkedin: "",
      cvFile: "",
      cvFileName: "",
      cgpa: "",
      graduated: false,
    },
    skills: [],
    projects: [],
    certificates: [],
    academic: [],
    achievements: [],
    clubs: [],
    results: [],
  };
}

export function isProfileComplete(data: Store) {
  const { name, studentId, programme, faculty, year, email } = data.profile;
  return [name, studentId, programme, faculty, year, email].every((value) => value.trim());
}

export function isEmptyProfileData(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    Object.keys(data).length === 0
  );
}
