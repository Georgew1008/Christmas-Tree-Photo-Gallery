
const DB_NAME = 'HoloChristmasTreeDB';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

// Open the Database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Save a list of files (Blobs)
export const saveImagesToDB = async (files: File[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // clear old store if you want strict "sync with folder" behavior, 
    // or keep append. Here we append. 
    // If you want to replace, call store.clear() first.
    
    let processed = 0;
    if (files.length === 0) resolve();

    files.forEach(file => {
      // Store the file blob directly
      const request = store.put({ 
        content: file, 
        name: file.name, 
        date: new Date() 
      });

      request.onsuccess = () => {
        processed++;
        if (processed === files.length) resolve();
      };
      request.onerror = () => reject(request.error);
    });

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Retrieve all images
export const loadImagesFromDB = async (): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;
      // Convert blobs back to ObjectURLs
      const urls = records.map((record: any) => URL.createObjectURL(record.content));
      db.close();
      resolve(urls);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Clear all images
export const clearImagesFromDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      db.close();
      resolve();
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};
