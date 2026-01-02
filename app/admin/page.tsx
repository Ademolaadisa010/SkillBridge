"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface User {
  id: string;
  name: string;
  role: "client" | "worker";
  verified?: boolean;
  skill?: string;
  dateAdded: string;
  createdAt?: any;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newWorker, setNewWorker] = useState({ name: "", skill: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workers = users.filter((u) => u.role === "worker");
  const clients = users.filter((u) => u.role === "client");
  const pendingWorkers = workers.filter((w) => !w.verified);

  // Load users from Firebase on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollection = collection(db, "users");
      const q = query(usersCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only add users with valid name
        if (data.name) {
          fetchedUsers.push({
            id: doc.id,
            name: data.name || "Unknown",
            role: data.role || "client",
            verified: data.verified || false,
            skill: data.skill || "",
            dateAdded: data.dateAdded || new Date().toISOString().split("T")[0],
            createdAt: data.createdAt,
          });
        }
      });
      
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error loading users:", err);
      setError("Failed to load users from Firebase");
      showNotification("Failed to load data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWorker = async (id: string) => {
    try {
      const userRef = doc(db, "users", id);
      await updateDoc(userRef, {
        verified: true,
      });
      
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, verified: true } : user
        )
      );
      showNotification("Worker verified successfully!");
    } catch (err) {
      console.error("Error verifying worker:", err);
      showNotification("Failed to verify worker", "error");
    }
  };

  const addWorker = async () => {
    if (!newWorker.name.trim() || !newWorker.skill.trim()) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    try {
      const newWorkerData = {
        name: newWorker.name.trim(),
        role: "worker",
        verified: false,
        skill: newWorker.skill.trim(),
        dateAdded: new Date().toISOString().split("T")[0],
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "users"), newWorkerData);
      
      const addedWorker: User = {
        id: docRef.id,
        ...newWorkerData,
      };

      setUsers((prev) => [addedWorker, ...prev]);
      setNewWorker({ name: "", skill: "" });
      showNotification("Worker added successfully!");
    } catch (err) {
      console.error("Error adding worker:", err);
      showNotification("Failed to add worker", "error");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((user) => user.id !== id));
      showNotification("User deleted successfully!");
    } catch (err) {
      console.error("Error deleting user:", err);
      showNotification("Failed to delete user", "error");
    }
  };

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredUsers = users.filter((user) =>
    user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
          notification.includes("Failed") || notification.includes("error") 
            ? "bg-red-600" 
            : "bg-green-600"
        } text-white`}>
          {notification}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
            <p className="text-gray-700">Loading data from Firebase...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="fixed top-20 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-red-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#264653] text-white p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>

        <nav className="flex-1">
          <ul className="space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "users", label: "Manage Users", icon: "👥" },
              { id: "verification", label: "Worker Verification", icon: "👷" },
              { id: "add-worker", label: "Add Worker", icon: "➕" },
              { id: "settings", label: "Settings", icon: "⚙️" },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? "bg-[#FF6B35] text-white"
                      : "hover:bg-[#2a5a6b] text-gray-200"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-600">
          <p className="text-xs text-gray-400">Logged in as Admin</p>
          <button
            onClick={() => {
              loadUsers();
              showNotification("Data refreshed from Firebase");
            }}
            className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
          >
            🔄 Refresh Data
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          {activeTab === "dashboard" && "Dashboard Overview"}
          {activeTab === "users" && "Manage Users"}
          {activeTab === "verification" && "Worker Verification"}
          {activeTab === "add-worker" && "Add New Worker"}
          {activeTab === "settings" && "Settings"}
        </h1>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Users" value={users.length} />
              <StatCard title="Clients" value={clients.length} />
              <StatCard title="Workers" value={workers.length} />
              <StatCard
                title="Pending Verification"
                value={pendingWorkers.length}
                highlight
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Recent Activity</h3>
                <div className="space-y-3">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">
                          {user.role === "worker" ? `${user.skill} - ` : ""}Added {user.dateAdded}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "client" 
                          ? "bg-blue-100 text-blue-700"
                          : user.verified 
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {user.role === "client" ? "Client" : user.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No users yet</p>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("add-worker")}
                    className="w-full bg-[#FF6B35] text-white px-4 py-3 rounded-lg hover:bg-[#e5612f] transition-colors"
                  >
                    ➕ Add New Worker
                  </button>
                  <button
                    onClick={() => setActiveTab("verification")}
                    className="w-full bg-[#264653] text-white px-4 py-3 rounded-lg hover:bg-[#1d3540] transition-colors"
                  >
                    👷 Review Verifications ({pendingWorkers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("users")}
                    className="w-full border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    👥 Manage All Users
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        {/* MANAGE USERS TAB */}
        {activeTab === "users" && (
          <section className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search users by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b-2 border-gray-200">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Skill/Type</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date Added</th>
                      <th className="py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-800">{user.name}</td>
                        <td className="py-4 px-4 capitalize">{user.role}</td>
                        <td className="py-4 px-4">{user.skill || "N/A"}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.role === "client" 
                              ? "bg-blue-100 text-blue-700"
                              : user.verified 
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {user.role === "client" ? "Active" : user.verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{user.dateAdded}</td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* WORKER VERIFICATION TAB */}
        {activeTab === "verification" && (
          <section className="bg-white rounded-xl p-6 shadow-sm border">
            <p className="text-gray-600 mb-6">Review and approve worker verification requests.</p>

            {pendingWorkers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-500 text-lg">No pending verification requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b-2 border-gray-200">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Skill</th>
                      <th className="py-3 px-4 font-semibold">Date Added</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWorkers.map((worker) => (
                      <tr key={worker.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-800">{worker.name}</td>
                        <td className="py-4 px-4">{worker.skill}</td>
                        <td className="py-4 px-4 text-gray-600">{worker.dateAdded}</td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            Pending Review
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => verifyWorker(worker.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-green-700 transition-colors font-medium"
                          >
                            ✓ Verify Worker
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ADD WORKER TAB */}
        {activeTab === "add-worker" && (
          <section className="bg-white rounded-xl p-6 shadow-sm border max-w-2xl">
            <p className="text-gray-600 mb-6">Add a new worker to the platform. They will need verification before becoming active.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter worker's full name"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skill/Profession *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Electrician, Plumber, Carpenter"
                  value={newWorker.skill}
                  onChange={(e) => setNewWorker({ ...newWorker, skill: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>

              <button
                onClick={addWorker}
                className="w-full bg-[#FF6B35] text-white rounded-lg px-6 py-3 font-medium hover:bg-[#e5612f] transition-colors"
              >
                ➕ Add Worker
              </button>
            </div>
          </section>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <section className="bg-white rounded-xl p-6 shadow-sm border max-w-2xl">
            <div className="space-y-6">
              <div className="pb-6 border-b">
                <h3 className="text-lg font-semibold mb-2">Account Settings</h3>
                <p className="text-gray-600 text-sm">Manage your admin account preferences</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates about new verifications</p>
                  </div>
                  <button className="bg-gray-200 rounded-full w-12 h-6 relative">
                    <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Auto-approve Workers</p>
                    <p className="text-sm text-gray-600">Automatically verify workers with complete profiles</p>
                  </div>
                  <button className="bg-gray-200 rounded-full w-12 h-6 relative">
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full"></div>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <button className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors">
                  Sign Out
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* SMALL COMPONENT */
function StatCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-xl shadow-sm border ${
        highlight ? "bg-orange-50" : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
    </div>
  );
}