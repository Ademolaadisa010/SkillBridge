"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface ClientProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  bio: string;
  profileImage: string;
}

export default function ClientProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<ClientProfile>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    bio: "",
    profileImage: "https://via.placeholder.com/150",
  });

  // 🔥 LOAD USER PROFILE
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setUserId(user.uid);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProfile({
          fullName: snap.data().fullName || "",
          email: snap.data().email || user.email || "",
          phone: snap.data().phone || "",
          address: snap.data().address || "",
          city: snap.data().city || "",
          bio: snap.data().bio || "",
          profileImage:
            snap.data().profileImage ||
            "https://via.placeholder.com/150",
        });
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 🔁 INPUT CHANGE
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 💾 SAVE PROFILE
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    await updateDoc(doc(db, "users", userId), {
      fullName: profile.fullName,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      bio: profile.bio,
      profileImage: profile.profileImage,
      updatedAt: new Date(),
    });

    setIsEditing(false);
  };

  if (loading) {
    return <div className="p-8">Loading profile...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientSidebar />

      <main className="flex-1 p-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">

          {/* TOP CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-orange-50"
                />
                <button
                  type="button"
                  className="absolute bottom-1 right-1 bg-white shadow-md p-2 rounded-full text-gray-600 hover:text-[#FF6B35]"
                >
                  <i className="fa-solid fa-camera"></i>
                </button>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-800">
                  {isEditing
                    ? "Update Your Profile"
                    : profile.fullName || "Complete Your Profile"}
                </h1>
                <p className="text-gray-500">
                  Manage your personal information and preferences
                </p>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2A9D8F] text-white px-6 py-2 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CONTENT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* BASIC INFO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-6">
                Basic Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      name="fullName"
                      value={profile.fullName}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-lg"
                    />
                  ) : (
                    <p className="font-medium">{profile.fullName || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Email
                  </label>
                  <p className="p-2 bg-gray-50 rounded-lg">
                    {profile.email}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-lg"
                    />
                  ) : (
                    <p>{profile.phone || "Add phone number"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ADDRESS & BIO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-6">
                Address & Bio
              </h2>

              <div className="space-y-4">
                <input
                  name="city"
                  placeholder="City"
                  value={profile.city}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-2 border rounded-lg"
                />

                <input
                  name="address"
                  placeholder="Address"
                  value={profile.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-2 border rounded-lg"
                />

                <textarea
                  name="bio"
                  placeholder="Short bio"
                  value={profile.bio}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
