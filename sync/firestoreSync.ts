// import firestore from "@react-native-firebase/firestore";
// import auth from "@react-native-firebase/auth";
// import {
//   getUnsynced,
//   upsertManyTx,
//   getSyncState,
//   upsertSyncState,
// } from "@/db/sqlite/repos/transactionRepo";

// export async function syncWithFirestore(uid: string) {
//   // const uid = auth().currentUser?.uid;
//   if (!uid) return;

//   // Push unsynced (batched)
//   const unsynced = await getUnsynced(uid);
//   if (unsynced.length > 0) {
//     const batch = firestore().batch();
//     unsynced.forEach((t) => {
//       const ref = firestore().collection("transactions").doc(t.id);
//       batch.set(
//         ref,
//         {
//           userId: uid,
//           amount: t.amount,
//           category: t.category,
//           date: t.dateIso,
//           notes: t.notes,
//           type: t.type,
//           timestamp: firestore.FieldValue.serverTimestamp(),
//           deleted: !!t.deleted,
//         },
//         { merge: true }
//       );
//     });
//     await batch.commit();
//   }
//   await upsertSyncState(uid, { lastPushMs: Date.now() });

//   // Pull after cursor (server timestamp)
//   const state = await getSyncState(uid);
//   let q = firestore()
//     .collection("transactions")
//     .where("userId", "==", uid)
//     .orderBy("timestamp", "asc")
//     .limit(500);
//   if (state?.lastPullMs) {
//     q = q.startAfter(new Date(state.lastPullMs) as any);
//   }
//   const snap = await q.get();
//   const items: any[] = [];
//   let lastTs: number | undefined;
//   snap.forEach((d) => {
//     const x = d.data() as any;
//     const ts = x?.timestamp?.toDate
//       ? x.timestamp.toDate().getTime()
//       : Date.now();
//     lastTs = ts;
//     items.push({
//       id: d.id,
//       userId: x.userId,
//       amount: x.amount,
//       category: x.category,
//       dateIso: x?.date?.toDate ? x.date.toDate().toISOString() : x.date,
//       notes: x.notes ?? "",
//       type: String(x.type || "expense").toLowerCase(),
//       synced: true,
//       updatedAt: Date.now(),
//       deleted: !!x.deleted,
//     });
//   });

//   if (items.length > 0) {
//     upsertManyTx(items as any);
//   }
//   if (lastTs) {
//     upsertSyncState(uid, {
//       lastPullMs: lastTs,
//       lastPullCursor: String(lastTs),
//     });
//   }
// }
