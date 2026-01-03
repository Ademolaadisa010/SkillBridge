"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDoc,
  Timestamp 
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from "firebase/auth";
import { db, auth } from "@/lib/firebase";

interface User {
  id: string;
  name: string;
  role: "client" | "worker" | "admin";
  verified?: boolean;
  skill?: string;
  dateAdded: string;
  createdAt?: any;
  email?: string;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newWorker, setNewWorker] = useState({ name: "", skill: "", email: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const workers = users.filter((u) => u.role === "worker");
  const clients = users.filter((u) => u.role === "client");
  const pendingWorkers = workers.filter((w) => !w.verified);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        console.log("✅ User authenticated:", user.uid, user.email);
        
        // Check if user is admin
        try {
          console.log("🔍 Checking user role in Firestore...");
          const userDocRef = doc(db, "users", user.uid);
          console.log("📍 Looking for document at:", `users/${user.uid}`);
          
          const userDoc = await getDoc(userDocRef);
          console.log("📄 Document exists?", userDoc.exists());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("👤 User data:", userData);
            console.log("🔑 User role:", userData.role);
            
            if (userData.role === "admin") {
              console.log("✅ User is admin, loading users...");
              setIsAuthenticated(true);
              await loadUsers();
            } else {
              console.log("❌ User is not admin, role is:", userData.role);
              setError("Access denied. You must be an admin to access this panel.");
              await firebaseSignOut(auth);
            }
          } else {
            console.log("❌ No user document found at users/" + user.uid);
            setError("User profile not found in database. Contact administrator.");
            await firebaseSignOut(auth);
          }
        } catch (err) {
          console.error("❌ Error checking user role:", err);
          setError("Failed to verify admin status");
          await firebaseSignOut(auth);
        }
      } else {
        console.log("❌ No user authenticated");
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUsers = async () => {
    console.log("🚀 loadUsers function called");
    
    if (!auth.currentUser) {
      console.log("❌ No current user in loadUsers");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Fetching users collection...");
      const usersCollection = collection(db, "users");
      const querySnapshot = await getDocs(usersCollection);
      
      console.log(`📊 Found ${querySnapshot.size} documents in Firestore`);
      
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        console.log("📄 Document:", docSnapshot.id, data);
        
        fetchedUsers.push({
          id: docSnapshot.id,
          name: data.name || data.displayName || data.email || "Unknown",
          role: data.role || "client",
          verified: data.verified || false,
          skill: data.skill || "",
          email: data.email || "",
          dateAdded: data.dateAdded || new Date().toISOString().split("T")[0],
          createdAt: data.createdAt,
        });
      });
      
      // Sort by newest first
      fetchedUsers.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
      
      console.log("✅ Processed users:", fetchedUsers);
      console.log("✅ Total users loaded:", fetchedUsers.length);
      setUsers(fetchedUsers);
      
    } catch (err: any) {
      console.error("❌ Error loading users:", err);
      
      if (err.code === "permission-denied") {
        setError("Permission denied. Check Firestore rules.");
      } else {
        setError(`Failed to load users: ${err.message}`);
      }
      showNotification("Failed to load data", "error");
    } finally {
      setIsLoading(false);
      console.log("✅ loadUsers completed");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      showNotification("Login successful!");
    } catch (err: any) {
      console.error("❌ Login error:", err);
      setError(`Login failed: ${err.message}`);
      showNotification("Login failed", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUsers([]);
      setIsAuthenticated(false);
      showNotification("Signed out successfully");
    } catch (err: any) {
      console.error("Sign out error:", err);
      showNotification("Failed to sign out", "error");
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
    } catch (err: any) {
      console.error("Error verifying worker:", err);
      showNotification(`Failed to verify worker: ${err.message}`, "error");
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
        role: "worker" as const,
        verified: false,
        skill: newWorker.skill.trim(),
        email: newWorker.email.trim() || "",
        dateAdded: new Date().toISOString().split("T")[0],
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "users"), newWorkerData);
      
      const addedWorker: User = {
        id: docRef.id,
        ...newWorkerData,
      };

      setUsers((prev) => [addedWorker, ...prev]);
      setNewWorker({ name: "", skill: "", email: "" });
      showNotification("Worker added successfully!");
    } catch (err: any) {
      console.error("Error adding worker:", err);
      showNotification(`Failed to add worker: ${err.message}`, "error");
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
    } catch (err: any) {
      console.error("Error deleting user:", err);
      showNotification(`Failed to delete user: ${err.message}`, "error");
    }
  };

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredUsers = users.filter((user) =>
    user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#264653] mb-2">Admin Login</h1>
            <p className="text-gray-600">Sign in to access the admin panel</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#FF6B35] text-white rounded-lg px-6 py-3 font-medium hover:bg-[#e5612f] transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <div className="fixed top-20 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <p className="font-bold">Error:</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-red-900 font-bold"
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
          <p className="text-xs text-gray-400 mb-1">Logged in as</p>
          <p className="text-sm font-medium truncate mb-3">{currentUser?.email}</p>
          <button
            onClick={() => {
              loadUsers();
              showNotification("Data refreshed from Firebase");
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors block mb-2 w-full text-left"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs text-red-300 hover:text-red-100 transition-colors w-full text-left"
          >
            🚪 Sign Out
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
                          {user.role === "worker" ? `${user.skill} - ` : ""}{user.email}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "client" 
                          ? "bg-blue-100 text-blue-700"
                          : user.verified 
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {user.role === "admin" ? "Admin" : user.role === "client" ? "Client" : user.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No users found</p>
                      <button
                        onClick={() => setActiveTab("add-worker")}
                        className="text-sm text-[#FF6B35] hover:underline"
                      >
                        Add your first worker →
                      </button>
                    </div>
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

        {/* Rest of the tabs... (users, verification, add-worker, settings) - same as before */}
        {/* I'll add them in the next message if needed */}

      </main>
    </div>
  );
}

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