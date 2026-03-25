//  Handles importing notes from a JSON file with validation and duplicate prevention.

function validateNote(note) {
  if (typeof note !== "object" || note === null || Array.isArray(note)) {
    return { valid: false, reason: "Each note must be an object." };
  }
  if (typeof note.title !== "string" || note.title.trim() === "") {
    return { valid: false, reason: `Note is missing a valid "title" string.` };
  }
  if (!Array.isArray(note.tags)) {
    return {
      valid: false,
      reason: `Note "${note.title}" has an invalid "tags" field (must be an array).`,
    };
  }
  if (typeof note.content !== "string") {
    return {
      valid: false,
      reason: `Note "${note.title}" has an invalid "content" field (must be a string).`,
    };
  }
  if (typeof note.isArchived !== "boolean") {
    return {
      valid: false,
      reason: `Note "${note.title}" has an invalid "isArchived" field (must be a boolean).`,
    };
  }
  return { valid: true };
}

//  Validates the top-level JSON structure of an import file.

function validateImportStructure(parsed) {
  let notesArray;

  if (Array.isArray(parsed)) {
    // Bare array of notes
    notesArray = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === "object" &&
    Array.isArray(parsed.notes)
  ) {
    // Wrapped format: { exportedAt, version, count, notes: [...] }
    notesArray = parsed.notes;
  } else {
    return {
      valid: false,
      reason:
        'Invalid file format. Expected a JSON array of notes or an object with a "notes" array.',
    };
  }

  if (notesArray.length === 0) {
    return { valid: false, reason: "The file contains no notes to import." };
  }

  // Validate each note
  for (let i = 0; i < notesArray.length; i++) {
    const result = validateNote(notesArray[i]);
    if (!result.valid) {
      return {
        valid: false,
        reason: `Note at index ${i}: ${result.reason}`,
      };
    }
  }

  return { valid: true, notes: notesArray };
}

/**
 * Generates a simple fingerprint for a note to detect duplicates.
 * Uses title + content + archived status.
 * @param {Object} note
 * @returns {string}
 */
function noteFingerprint(note) {
  return `${note.title.trim().toLowerCase()}::${note.content.trim().toLowerCase()}::${note.isArchived}`;
}

/**
 * Merges imported notes into the existing notes array, skipping duplicates.
 * Assigns new IDs to imported notes to avoid ID collisions.
 *
 * @param {Array} existingNotes - The current notes array.
 * @param {Array} incomingNotes - The notes parsed from the import file.
 * @returns {{ merged: Array, added: number, skipped: number }}
 */
function mergeNotes(existingNotes, incomingNotes) {
  const existingFingerprints = new Set(existingNotes.map(noteFingerprint));

  let maxId =
    existingNotes.length > 0
      ? Math.max(...existingNotes.map((n) => n.id || 0))
      : 0;

  const toAdd = [];
  let skipped = 0;

  for (const note of incomingNotes) {
    const fp = noteFingerprint(note);
    if (existingFingerprints.has(fp)) {
      skipped++;
      continue;
    }
    maxId++;
    toAdd.push({
      ...note,
      id: maxId,
      title: note.title.trim(),
      tags: note.tags.map((t) => String(t).trim()).filter(Boolean),
      content: note.content,
      lastEdited: note.lastEdited || new Date().toISOString(),
      isArchived: Boolean(note.isArchived),
    });
    existingFingerprints.add(fp); // prevent duplicates within the import batch
  }

  return {
    merged: [...toAdd, ...existingNotes], // prepend imported notes to the top
    added: toAdd.length,
    skipped,
  };
}

//  Reads a File object and returns a Promise that resolves with the import result.

export function importNotesFromFile(file, existingNotes) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ success: false, message: "No file selected." });
      return;
    }
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      resolve({ success: false, message: "Only .json files are supported." });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      let parsed;
      try {
        parsed = JSON.parse(e.target.result);
      } catch {
        resolve({
          success: false,
          message: "Failed to parse file. Please ensure it is valid JSON.",
        });
        return;
      }

      const structureCheck = validateImportStructure(parsed);
      if (!structureCheck.valid) {
        resolve({ success: false, message: structureCheck.reason });
        return;
      }

      const { merged, added, skipped } = mergeNotes(
        existingNotes,
        structureCheck.notes,
      );

      if (added === 0) {
        resolve({
          success: false,
          message: `No new notes imported — all ${skipped} note${skipped !== 1 ? "s" : ""} already exist.`,
        });
        return;
      }

      let message = `${added} note${added !== 1 ? "s" : ""} imported successfully!`;
      if (skipped > 0) {
        message += ` (${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped)`;
      }

      resolve({ success: true, merged, added, skipped, message });
    };

    reader.onerror = () => {
      resolve({
        success: false,
        message: "Could not read the file. Please try again.",
      });
    };

    reader.readAsText(file);
  });
}
