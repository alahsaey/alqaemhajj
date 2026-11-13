import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, onSnapshot, getDocFromServer, serverTimestamp, 
  Timestamp, writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const isOfflineOrTransient =
    message.includes('the client is offline') ||
    message.includes('Could not reach Cloud Firestore backend') ||
    message.includes('unavailable');

  if (isOfflineOrTransient) {
    console.warn(`Firestore operating in offline/cached mode for ${operationType} on ${path}`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

// Connection check using an allowed collection path with cache fallback
export async function testFirestoreConnection() {
  try {
    await getDoc(doc(db, 'settings', 'campaign'));
  } catch {
    // Firestore automatically switches to offline cache when network is slow
  }
}

function normalizeTimestampField(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0] || '';
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate().toISOString().split('T')[0] || '';
    } catch {
      return new Date().toISOString().split('T')[0] || '';
    }
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString().split('T')[0] || '';
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0] || '';
  }
  return new Date().toISOString().split('T')[0] || '';
}

function normalizeDocData<T>(raw: Record<string, any>, id: string): T {
  const result: Record<string, any> = { ...raw, id };
  if ('createdAt' in result && typeof result.createdAt !== 'string') {
    result.createdAt = normalizeTimestampField(result.createdAt);
  }
  if ('updatedAt' in result && typeof result.updatedAt !== 'string') {
    result.updatedAt = normalizeTimestampField(result.updatedAt);
  }
  return result as T;
}

// Generic CRUD helpers with error handling
export async function getDocuments<T>(path: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map(d => normalizeDocData<T>(d.data(), d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getDocument<T>(path: string, id: string): Promise<T | null> {
  try {
    const snap = await getDoc(doc(db, path, id));
    return snap.exists() ? normalizeDocData<T>(snap.data(), snap.id) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    return null;
  }
}

function cleanData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (
    obj instanceof Date ||
    obj instanceof Timestamp ||
    Array.isArray(obj) ||
    '_methodName' in (obj as Record<string, any>) ||
    typeof (obj as Record<string, any>).toDate === 'function' ||
    (obj.constructor && obj.constructor.name === 'FieldValue')
  ) {
    return obj;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanData(value);
    }
  }
  return cleaned as T;
}

export async function setDocument(path: string, id: string, data: any) {
  try {
    const payload = cleanData({
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: typeof data.createdAt === 'string' && data.createdAt ? data.createdAt : new Date().toISOString().split('T')[0]
    });
    await setDoc(doc(db, path, id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

export async function updateDocument(path: string, id: string, data: any) {
  try {
    const payload = cleanData({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(doc(db, path, id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
}

export async function removeDocument(path: string, id: string) {
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

export function subscribeToCollection<T>(path: string, callback: (data: T[]) => void) {
  return onSnapshot(collection(db, path), 
    (snap) => {
      callback(snap.docs.map(d => normalizeDocData<T>(d.data(), d.id)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToDocument<T>(path: string, id: string, callback: (data: T | null) => void) {
  return onSnapshot(doc(db, path, id), 
    (snap) => {
      callback(snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    }
  );
}

export async function queryDocuments<T>(path: string, field: string, operator: any, value: any): Promise<T[]> {
  try {
    const q = query(collection(db, path), where(field, operator, value));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeDocData<T>(d.data(), d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToQuery<T>(path: string, field: string, operator: any, value: any, callback: (data: T[]) => void) {
  const q = query(collection(db, path), where(field, operator, value));
  return onSnapshot(q,
    (snap) => {
      callback(snap.docs.map(d => normalizeDocData<T>(d.data(), d.id)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function getSeasonPilgrims<T = any>(seasonYear: string = '1448'): Promise<T[]> {
  try {
    const q = query(collection(db, 'pilgrims'), where('seasonYear', '==', seasonYear));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => normalizeDocData<T>(d.data(), d.id));
    if (docs.length > 0) {
      return docs;
    }
    // Fallback: If some older docs in cache haven't migrated seasonYear, check hajjYear or id suffix
    const allSnap = await getDocs(collection(db, 'pilgrims'));
    return allSnap.docs
      .map(d => normalizeDocData<T>(d.data(), d.id))
      .filter((p: any) => 
        p.seasonYear === seasonYear || 
        p.hajjYear === seasonYear || 
        (p.id && p.id.includes(`_${seasonYear}`)) ||
        (!p.seasonYear && !p.hajjYear && seasonYear === '1448')
      );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'pilgrims');
    return [];
  }
}

export function subscribeToSeasonPilgrims<T = any>(seasonYear: string = '1448', callback: (data: T[]) => void) {
  const q = query(collection(db, 'pilgrims'), where('seasonYear', '==', seasonYear));
  return onSnapshot(q,
    (snap) => {
      const items = snap.docs.map(d => normalizeDocData<T>(d.data(), d.id));
      if (items.length > 0) {
        callback(items);
      } else {
        // Fallback to fetch docs matching year
        getDocs(collection(db, 'pilgrims')).then(allSnap => {
          const matched = allSnap.docs
            .map(d => normalizeDocData<T>(d.data(), d.id))
            .filter((p: any) => 
              p.seasonYear === seasonYear || 
              p.hajjYear === seasonYear || 
              (p.id && p.id.includes(`_${seasonYear}`)) ||
              (!p.seasonYear && !p.hajjYear && seasonYear === '1448')
            );
          callback(matched);
        }).catch(() => {
          callback([]);
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pilgrims');
    }
  );
}

const LOCAL_LOGS_KEY = 'qaem_activity_logs_v1';

export function getCachedActivityLogs(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function recordActivityLog(params: {
  adminId?: string;
  adminName: string;
  username?: string;
  userRole?: string;
  category?:
    | 'تسجيل دخول / خروج'
    | 'إدارة الحجاج'
    | 'المالية والإيصالات'
    | 'الباقات والإعلانات'
    | 'المشرفين والإعدادات'
    | 'بوابة الحاج والتسجيل';
  action: string;
  target: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
  const timeStr = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const id = `log-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`;

  const logEntry = {
    id,
    adminId: params.adminId || auth.currentUser?.uid || 'user',
    adminName: params.adminName || 'مستخدم النظام',
    username: params.username || auth.currentUser?.email || 'system',
    userRole: params.userRole || 'مستخدم',
    category: params.category || 'إدارة الحجاج',
    action: params.action,
    target: params.target,
    details: params.details || '',
    previousValue: params.previousValue || '',
    newValue: params.newValue || '',
    date: dateStr,
    time: timeStr,
    timestamp: now.toISOString(),
    createdAt: dateStr,
  };

  try {
    const existing = getCachedActivityLogs();
    const updated = [logEntry, ...existing].slice(0, 300);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('qaem-activity-logged', { detail: logEntry }));
  } catch {
    // Ignore localStorage quota errors
  }

  await setDocument('activityLogs', id, logEntry);
  return logEntry;
}


