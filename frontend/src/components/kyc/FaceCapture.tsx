import { useEffect, useRef, useState } from 'react';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs';
import '@mediapipe/face_detection';
import styles from './FaceCapture.module.css';

type Detector = faceDetection.FaceDetector | null;

interface Props {
  onCapture: (dataUrl: string) => void;
}

export const FaceCapture = ({ onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const detectorRef = useRef<Detector>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    let stream: MediaStream;
    const setupStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        setStreamError(
          error instanceof Error ? error.message : 'Camera permission denied'
        );
      }
    };
    setupStream();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const ensureDetector = async (): Promise<faceDetection.FaceDetector> => {
    if (!detectorRef.current) {
      detectorRef.current = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection'
        }
      );
    }
    return detectorRef.current;
  };

  const handleCapture = async (): Promise<void> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setIsDetecting(true);
    try {
      const detector = await ensureDetector();
      const faces = await detector.estimateFaces(canvas);
      if (faces.length === 0) {
        setStreamError('No face detected. Please ensure your face is clearly visible.');
        setIsDetecting(false);
        return;
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPreview(dataUrl);
      onCapture(dataUrl);
      setStreamError(null);
    } catch (error) {
      setStreamError(
        error instanceof Error ? error.message : 'Failed to verify face capture'
      );
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {streamError && <div className={styles.error}>{streamError}</div>}
      <video ref={videoRef} className={styles.video} playsInline muted />
      <canvas ref={canvasRef} className={styles.canvas} hidden />
      <div className={styles.controls}>
        <button type="button" className="btn" onClick={handleCapture} disabled={isDetecting}>
          {isDetecting ? 'Detecting…' : 'Capture'}
        </button>
        {preview && (
          <div className={styles.preview}>
            <p>Latest capture</p>
            <img src={preview} alt="Face preview" />
          </div>
        )}
      </div>
    </div>
  );
};
