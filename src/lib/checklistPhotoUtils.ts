import { supabase } from '@/integrations/supabase/client';

export interface ChecklistPhoto {
  id: string;
  checklist_id: string;
  item_id: string;
  photo_url: string;
  uploaded_at: string;
  display_order: number;
}

/**
 * Upload une photo de checklist vers le storage
 */
export const uploadChecklistPhoto = async (
  file: File,
  checklistId: string,
  itemId: string,
  photoIndex: number
): Promise<string> => {
  console.log('📸 [PHOTO] Upload photo:', { checklistId, itemId, photoIndex });
  
  // Validation du type de fichier
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image');
  }
  
  // Validation de la taille (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('L\'image ne doit pas dépasser 5MB');
  }
  
  // Compression et conversion en JPEG si besoin
  const compressedFile = await compressImage(file);
  
  // Nom du fichier avec timestamp pour éviter les collisions
  const fileName = `${checklistId}/${itemId}_${photoIndex}_${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('checklist-photos')
    .upload(fileName, compressedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg'
    });
  
  if (error) {
    console.error('❌ [PHOTO] Erreur upload:', error);
    throw error;
  }
  
  // Récupérer l'URL publique
  const { data: urlData } = supabase.storage
    .from('checklist-photos')
    .getPublicUrl(data.path);
  
  console.log('✅ [PHOTO] Photo uploadée:', urlData.publicUrl);
  return urlData.publicUrl;
};

/**
 * Supprimer une photo du storage
 */
export const deleteChecklistPhoto = async (photoUrl: string): Promise<void> => {
  console.log('🗑️ [PHOTO] Suppression photo:', photoUrl);
  
  // Extraire le chemin depuis l'URL
  const urlParts = photoUrl.split('/checklist-photos/');
  if (urlParts.length < 2) {
    throw new Error('URL de photo invalide');
  }
  
  const filePath = urlParts[1];
  
  const { error } = await supabase.storage
    .from('checklist-photos')
    .remove([filePath]);
  
  if (error) {
    console.error('❌ [PHOTO] Erreur suppression:', error);
    throw error;
  }
  
  console.log('✅ [PHOTO] Photo supprimée');
};

/**
 * Compresser une image avant upload
 */
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Créer un canvas pour la compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(file); // Retourner le fichier original si pas de contexte
          return;
        }
        
        // Redimensionner si l'image est trop grande
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en blob avec compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            
            // Créer un nouveau fichier avec le blob compressé
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log('📦 [PHOTO] Compression:', {
              original: (file.size / 1024).toFixed(2) + 'KB',
              compressed: (compressedFile.size / 1024).toFixed(2) + 'KB'
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85 // Qualité 85%
        );
      };
      
      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
    };
    
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
  });
};

/**
 * Récupérer toutes les photos d'un item de checklist
 */
export const getChecklistItemPhotos = async (
  checklistId: string,
  itemId: string
): Promise<ChecklistPhoto[]> => {
  const { data, error } = await supabase
    .from('checklist_item_photos')
    .select('*')
    .eq('checklist_id', checklistId)
    .eq('item_id', itemId)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('❌ [PHOTO] Erreur récupération photos:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Sauvegarder une photo dans la base de données
 */
export const saveChecklistPhoto = async (
  checklistId: string,
  itemId: string,
  photoUrl: string,
  displayOrder: number
): Promise<ChecklistPhoto> => {
  const { data, error } = await supabase
    .from('checklist_item_photos')
    .insert({
      checklist_id: checklistId,
      item_id: itemId,
      photo_url: photoUrl,
      display_order: displayOrder
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ [PHOTO] Erreur sauvegarde photo DB:', error);
    throw error;
  }
  
  return data;
};

/**
 * Supprimer une photo de la base de données
 */
export const deleteChecklistPhotoFromDB = async (photoId: string): Promise<void> => {
  const { error } = await supabase
    .from('checklist_item_photos')
    .delete()
    .eq('id', photoId);
  
  if (error) {
    console.error('❌ [PHOTO] Erreur suppression photo DB:', error);
    throw error;
  }
};
