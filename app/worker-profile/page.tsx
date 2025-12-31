"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface WorkerProfile {
  fullName: string;
  email: string;
  phone: string;
  category: string;
  yearsOfExperience: string;
  bio: string;
  hourlyRate: string;
  location: string;
  skills: string[];
  education: string;
}

export default function WorkerProfilePage() {
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [skillInput, setSkillInput] = useState("");
  const [profile, setProfile] = useState<WorkerProfile>({
    fullName: "",
    email: "",
    phone: "",
    category: "",
    yearsOfExperience: "",
    bio: "",
    hourlyRate: "",
    location: "Ibadan, Nigeria",
    skills: [],
    education: "",
  });

  // 🔥 LOAD WORKER PROFILE
  useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    setUserId(user.uid);

    const ref = doc(db, "workers", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setProfile(snap.data() as WorkerProfile); // load once
    } else {
      setProfile((prev) => ({ ...prev, email: user.email || "" }));
    }

    setLoading(false);
  });

  return () => unsub();
}, []);


  // 🔁 INPUT CHANGE
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // ➕ ADD / REMOVE SKILLS
  const addSkill = () => {
    if (skillInput && !profile.skills.includes(skillInput)) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, skillInput] }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  // 💾 SAVE PROFILE
  const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if (!userId) return;

  try {
    const profileRef = doc(db, "workers", userId);
    await setDoc(profileRef, profile, { merge: true });
    setIsEditing(false); // lock inputs after saving
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Failed to save profile. Try again.");
  }
};


  if (loading) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <WorkerSidebar />

      <main className="flex-1 p-4 lg:p-8">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">

          {/* HEADER */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Professional Profile</h1>
              <p className="text-sm text-gray-500">This information will be visible to potential clients.</p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-[#FF6B35] text-white px-6 py-2 rounded-lg hover:bg-[#e85a20]"
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="submit"
                className="bg-[#2A9D8F] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#21867a]"
              >
                Save Profile
              </button>
            )}


          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className="w-full h-full bg-orange-50 rounded-full border-4 border-white shadow-md flex items-center justify-center text-[#FF6B35] text-4xl font-bold">
                    {profile.fullName ? profile.fullName[0] : "?"}
                  </div>
                  <button type="button" className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md text-gray-600 border border-gray-100 hover:text-[#FF6B35]">
                    <i className="fa-solid fa-camera"></i>
                  </button>
                </div>
                <h3 className="font-bold text-gray-800">{profile.fullName || "Your Name"}</h3>
                <p className="text-sm text-gray-400">{profile.email}</p>

                <div className="mt-8 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Full Name</label>
                    <input
                      name="fullName"
                      value={profile.fullName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
                    <input
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Location</label>
                    <input
                      name="location"
                      value={profile.location}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Work Experience & Expertise</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Main Category</label>
                    <select
                      name="category"
                      value={profile.category}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    >
                      <option value="">Select Trade</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Carpentry">Carpentry</option>
                      <option value="Painting">Painting</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Years of Experience</label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={profile.yearsOfExperience}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Hourly Rate</label>
                    <input
                      name="hourlyRate"
                      value={profile.hourlyRate}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Education</label>
                    <input
                      name="education"
                      value={profile.education}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full mt-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold text-gray-400 uppercase">Detailed Bio / Pitch</label>
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleChange}
                    disabled={!isEditing}
                    rows={4}
                    className="w-full mt-1 p-3 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                  />
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold text-gray-400 uppercase">Skills</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      disabled={!isEditing}
                      placeholder="e.g. Conduit Wiring"
                      className="flex-1 p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                    />
                    {isEditing && (
                      <button type="button" onClick={addSkill} className="bg-gray-800 text-white px-4 rounded-lg hover:bg-black transition-colors">
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="bg-orange-50 text-[#FF6B35] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        {skill}
                        {isEditing && (
                          <button type="button" onClick={() => removeSkill(skill)}>
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
