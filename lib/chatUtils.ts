// lib/chatUtils.ts
// Shared utility — call this whenever a job is accepted/payment verified
// to ensure a chat exists between client and worker.

import {
  collection, query, where, getDocs, addDoc,
  serverTimestamp, doc, getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getOrCreateChat({
  clientId,
  workerId,
  jobId,
  service,
}: {
  clientId: string;
  workerId: string;
  jobId?: string;
  service?: string;
}): Promise<string> {
  // 1. Check if a chat already exists between these two users
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", clientId)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find(d =>
    (d.data().participants as string[]).includes(workerId)
  );
  if (existing) return existing.id;

  // 2. Fetch names from users collection
  let clientName = "Client";
  let workerName = "Worker";
  try {
    const [cSnap, wSnap] = await Promise.all([
      getDoc(doc(db, "users", clientId)),
      getDoc(doc(db, "users", workerId)),
    ]);
    if (cSnap.exists()) clientName = cSnap.data().displayName || cSnap.data().fullName || "Client";
    if (wSnap.exists()) workerName = wSnap.data().displayName || wSnap.data().fullName || "Worker";
  } catch {}

  // 3. Create the chat
  const chatRef = await addDoc(collection(db, "chats"), {
    participants: [clientId, workerId],
    participantDetails: {
      [clientId]: { name: clientName, role: "client" },
      [workerId]: { name: workerName, role: "worker" },
    },
    jobId:          jobId    || null,
    bookingService: service  || "Service",
    paymentConfirmed: true,
    lastMessage:    "Chat started — payment confirmed",
    lastMessageAt:  serverTimestamp(),
    unreadCount:    { [clientId]: 1, [workerId]: 0 },
    createdAt:      serverTimestamp(),
  });

  // 4. Add a system message
  await addDoc(collection(db, "messages"), {
    chatId:    chatRef.id,
    senderId:  "system",
    text:      `✅ Payment confirmed! You can now discuss the job details here.`,
    createdAt: serverTimestamp(),
    read:      false,
    system:    true,
  });

  return chatRef.id;
}