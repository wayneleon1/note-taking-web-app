// Handles exporting all notes to a downloadable JSON file.
export function exportNotes(notes) {
  if (!notes || notes.length === 0) {
    return { success: false, message: "No notes to export." };
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    count: notes.length,
    notes: notes,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const link = document.createElement("a");
  link.href = url;
  link.download = `notes-export-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Free the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    success: true,
    message: `${notes.length} note${notes.length !== 1 ? "s" : ""} exported successfully!`,
  };
}
