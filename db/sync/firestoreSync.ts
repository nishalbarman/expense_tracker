import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import {
  getUnsynced,
  upsertManyTx,
  getSyncState,
  upsertSyncState,
} from "@/db/sqlite/repos/transactionRepo";

export async function syncWithFirestore(uid: string) {
  // const uid = auth().currentUser?.uid;
  if (!uid) return;

  // Push unsynced (batched)
  const unsynced = await getUnsynced(uid);
  console.log("Unsynced Data", unsynced);
  if (unsynced.length > 0) {
    const batch = firestore().batch();
    unsynced.forEach((row: any) => {
      const ref = firestore().collection("transactions").doc(row.id);
      batch.set(
        ref,
        {
          userId: uid,
          amount: row.amount,
          category: row.category,
          date: row.dateIso,
          notes: row.notes,
          type: row.type,
          timestamp: firestore.FieldValue.serverTimestamp(),
          deleted: !!row.deleted,
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
  await upsertSyncState(uid, { lastPushMs: Date.now() });

  // Pull after cursor (server timestamp)
  const state = await getSyncState(uid);
  let query = firestore()
    .collection("transactions")
    .where("userId", "==", uid)
    .orderBy("timestamp", "asc");
  // .limit(500);
  if (state?.lastPullMs) {
    query = query.startAfter(new Date(state.lastPullMs) as any);
  }

  const snap = await query.get();

  const items: any[] = [];

  let lastTs: number | undefined;

  snap.forEach((d) => {
    const x = d.data() as any;
    const ts = x?.timestamp?.toDate
      ? x.timestamp.toDate().getTime()
      : Date.now();
    lastTs = ts;
    items.push({
      id: d.id,
      userId: x.userId,
      amount: x.amount,
      category: x.category,
      dateIso: x?.date?.toDate ? x.date.toDate().toISOString() : x.date,
      notes: x.notes ?? "",
      type: String(x.type || "expense").toLowerCase(),
      synced: true,
      updatedAt: Date.now(),
      deleted: !!x.deleted,
    });
  });

  if (items.length > 0) {
    await upsertManyTx(items as any);
  }
  if (lastTs) {
    await upsertSyncState(uid, {
      lastPullMs: lastTs,
      lastPullCursor: String(lastTs),
    });
  }
}
