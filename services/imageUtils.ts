
export const resizeImage = (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const elem = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Maintain aspect ratio
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                
                elem.width = width;
                elem.height = height;
                const ctx = elem.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                
                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);
                
                // Force JPEG format for better compression (PNGs can be huge)
                // Quality 0.7 is a good balance for flyers/photos
                resolve(elem.toDataURL('image/jpeg', quality)); 
            };
            img.onerror = (error) => reject(new Error("Failed to load image for resizing"));
        };
        reader.onerror = (error) => reject(new Error("Failed to read file"));
    });
};

export const isBase64ImageUrl = (value?: string | null): value is string => {
    return typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
};

export const dataURLtoBlob = (dataUrl: string): Blob => {
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/^data:(.+);base64$/);

    if (!mimeMatch || !base64Data) {
        throw new Error('Invalid image data URL.');
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeMatch[1] });
};
