// Save system: autosave to localStorage; export/import as a JSON file.
const KEY = 'hollowisle.save.v1';
const VERSION = 1;

function serialize(progress) {
  return {
    version: VERSION,
    ...progress,
    flags: [...progress.flags],
    timestamp: Date.now(),
  };
}

function deserialize(data) {
  if (!data || data.version !== VERSION) return null;
  if (!data.location?.map || !Array.isArray(data.flags)) return null;
  const { version, timestamp, ...progress } = data;
  progress.flags = new Set(data.flags);
  progress.keys ??= {};
  return progress;
}

export const Save = {
  exists() {
    return localStorage.getItem(KEY) !== null;
  },

  write(progress) {
    try {
      localStorage.setItem(KEY, JSON.stringify(serialize(progress)));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return deserialize(JSON.parse(raw));
    } catch (e) {
      console.warn('Save corrupt:', e);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(KEY);
  },

  exportFile(progress) {
    const blob = new Blob([JSON.stringify(serialize(progress), null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hollow-isle-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // Opens a file picker; resolves with progress or rejects on invalid file.
  importFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        try {
          const file = input.files[0];
          if (!file) return reject(new Error('No file chosen'));
          const progress = deserialize(JSON.parse(await file.text()));
          if (!progress) return reject(new Error('Not a valid save file'));
          resolve(progress);
        } catch (e) {
          reject(new Error('Could not read save file'));
        }
      };
      input.click();
    });
  },
};
