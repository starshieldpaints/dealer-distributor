import { ImageAnnotatorClient } from '@google-cloud/vision';
import { logger } from '../../logger';

let client: ImageAnnotatorClient | null = null;
let clientUnavailable = false;

const getClient = (): ImageAnnotatorClient | null => {
  if (clientUnavailable) {
    return null;
  }
  if (!client) {
    try {
      client = new ImageAnnotatorClient();
    } catch (error) {
      clientUnavailable = true;
      logger.warn(
        { error },
        'Google Vision client unavailable; face verification will be deferred'
      );
      return null;
    }
  }
  return client;
};

export const verifyFaceFromFile = async (filePath: string): Promise<boolean> => {
  try {
    const annotator = getClient();
    if (!annotator) {
      return false;
    }
    const [result] = await annotator.faceDetection(filePath);
    const faces = result.faceAnnotations ?? [];
    return faces.length > 0;
  } catch (error) {
    logger.warn({ error }, 'Face verification failed, defaulting to manual review');
    return false;
  }
};
