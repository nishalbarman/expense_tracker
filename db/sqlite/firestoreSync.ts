// // src/db/sqlite/firestoreSync.ts
// import firestore from "@react-native-firebase/firestore";
// import { db } from "./client";
// import { Transaction } from "@/types";

// // Push unsynced changes to Firestore
// export async function pushToFirestore(userId: string) {
//   const database = await db();

//   const rows = await database.getAllAsync(
//     `SELECT * FROM transactions WHERE user_id = ? AND synced = 0`,
//     [userId]
//   );

//   const batch = firestore().batch();
//   const userRef = firestore().collection("users").doc(userId);

//   for (const row of rows as Transaction[]) {
//     const txRef = userRef.collection("transactions").doc(row.id);

//     if (row.deleted) {
//       batch.delete(txRef);
//     } else {
//       batch.set(txRef, {
//         userId: userId,
//         amount: row.amount,
//         category: row.category,
//         date_iso: row.dateIso,
//         notes: row.notes,
//         type: row.type,
//         timestamp: firestore.FieldValue.serverTimestamp(),
//         updated_at: row.updated_at,
//         deleted: row.deleted,
//       });
//     }
//   }

//   if (rows.length) {
//     await batch.commit();
//     await database.runAsync(
//       `UPDATE transactions SET synced = 1 WHERE user_id = ?`,
//       [userId]
//     );
//     await database.runAsync(`DELETE transactions WHERE deleted = 1`);
//     await database.runAsync(
//       `UPDATE sync_state SET last_push_ms = ? WHERE user_id = ?`,
//       [Date.now(), userId]
//     );
//   }
// }

// // Pull changes from Firestore into SQLite
// export async function pullFromFirestore(userId: string) {
//   const database = await db();

//   const syncRow: any = await database.getFirstAsync(
//     `SELECT last_pull_cursor FROM sync_state WHERE user_id = ?`,
//     [userId]
//   );

//   const lastCursor = syncRow?.last_pull_cursor ?? null;

//   let query = firestore()
//     .collection("users")
//     .doc(userId)
//     .collection("transactions")
//     .orderBy("updated_at", "asc");

//   if (lastCursor) {
//     query = query.startAfter(lastCursor);
//   }

//   const snapshot = await query.get();

//   await database.withTransactionAsync(async () => {
//     for (const doc of snapshot.docs) {
//       const data = doc.data();

//       // 🔍 Check local row
//       const localRow: any = await database.getFirstAsync(
//         `SELECT id, synced, deleted FROM transactions WHERE id = ? AND user_id = ?`,
//         [doc.id, userId]
//       );

//       if (localRow && localRow.synced === 0) {
//         // 🚫 Local row has unsynced changes → skip overwriting
//         console.log(
//           `Skipping doc ${doc.id} because local changes are unsynced (local wins)`
//         );
//         continue;
//       }

//       // ✅ Apply Firestore changes (since no conflict with local unsynced data)
//       await database.runAsync(
//         `
//           INSERT INTO transactions (id, user_id, amount, category, date_iso, notes, type, synced, updated_at, deleted)
//           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
//           ON CONFLICT(id) DO UPDATE SET
//             amount=excluded.amount,
//             category=excluded.category,
//             date_iso=excluded.date_iso,
//             notes=excluded.notes,
//             type=excluded.type,
//             updated_at=excluded.updated_at,
//             deleted=excluded.deleted,
//             synced=1
//         `,
//         [
//           doc.id,
//           userId,
//           data.amount,
//           data.category,
//           data.date_iso,
//           data.notes ?? "",
//           data.type,
//           data.updated_at,
//           data.deleted ?? 0,
//         ]
//       );
//     }

//     await database.runAsync(
//       `INSERT INTO sync_state (user_id, last_pull_cursor, last_pull_ms, last_push_ms)
//        VALUES (?, ?, ?, ?)
//        ON CONFLICT(user_id) DO UPDATE SET
//          last_pull_cursor=excluded.last_pull_cursor,
//          last_pull_ms=excluded.last_pull_ms`,
//       [userId, Date.now(), Date.now(), Date.now()]
//     );
//   });
// }

// // Run a full sync (push first, then pull)
// export async function syncWithFirestore(userId: string) {
//   await pushToFirestore(userId);
//   await pullFromFirestore(userId);
// }
