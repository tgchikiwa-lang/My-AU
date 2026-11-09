import { describe, expect, it } from "vitest";
import { parseBackup } from "@/lib/profile-backup";
import { createEmptyStore, isProfileComplete } from "@/lib/profile-state";
import { initial } from "./fixtures";
describe("Student backup restoration", () => {
  it("restores skills, projects, certifications and activities", () => {
    const data = {
      ...initial,
      certificates: [{ id: "cert", title: "Web design", issuer: "AU", date: "2026-10" }],
    };
    const restored = parseBackup(JSON.stringify({ version: 1, data }));
    expect(restored.skills).toEqual(data.skills);
    expect(restored.projects).toEqual(data.projects);
    expect(restored.certificates).toEqual(data.certificates);
    expect(restored.clubs).toEqual(data.clubs);
  });
  it("never imports passwords or account identity", () => {
    const restored = parseBackup(
      JSON.stringify({ version: 1, data: { ...initial, password: "secret", id: "other-user" } }),
    );
    expect(restored).not.toHaveProperty("password");
    expect(restored).not.toHaveProperty("id");
  });
  it("rejects malformed backups", () =>
    expect(() => parseBackup('{"version":1,"data":{}}')).toThrow());
});

describe("New student profiles", () => {
  it("starts with the authenticated identity and no sample profile data", () => {
    const data = createEmptyStore("Test Student", "student@example.test");
    expect(data.profile.name).toBe("Test Student");
    expect(data.profile.email).toBe("student@example.test");
    expect(data.profile.studentId).toBe("");
    expect(data.profile.programme).toBe("");
    expect(data.skills).toEqual([]);
    expect(data.projects).toEqual([]);
  });

  it("requires student and academic identifiers before profile completion", () => {
    expect(isProfileComplete(createEmptyStore("Test Student", "student@example.test"))).toBe(false);
    const data = createEmptyStore("Test Student", "student@example.test");
    data.profile.studentId = "AU-TEST-1";
    data.profile.programme = "Test programme";
    data.profile.faculty = "Test faculty";
    data.profile.year = "Year 1";
    expect(isProfileComplete(data)).toBe(true);
  });
});
