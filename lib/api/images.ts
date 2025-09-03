export type SaveImageMetadataPayload = {
  projectId: string;
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  originalName?: string;
};

export async function saveImageMetadata(payload: SaveImageMetadataPayload) {
  try {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('Failed to save image metadata to server:', text);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error saving image metadata:', error);
    return null;
  }
}
