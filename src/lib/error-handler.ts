
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    phone: string | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Since this is a client-side utility, it's hard to get the latest user without context/hooks
  // We'll just log the error for now or try to get from localStorage if needed
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'unknown',
      phone: 'unknown',
    },
    operationType,
    path
  };
  
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  
  // Only throw if it's a permission error, otherwise just log
  if (errInfo.error.includes('insufficient permissions') || errInfo.error.includes('permission-denied')) {
    throw new Error(errorJson);
  }
}
