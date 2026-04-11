'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Square, WandSparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseApiError, parseApiResponse } from '@/app/lib/api-client';

interface ExperimentalLiveCaptureProps {
  itemType: 'daily' | 'regular';
  onComplete: () => void;
}

function getAudioMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && MediaRecorder.isTypeSupported('audio/aac')) {
    return 'audio/aac';
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm';
  }
  if (MediaRecorder.isTypeSupported('audio/ogg')) {
    return 'audio/ogg';
  }
  return 'audio/webm';
}

export default function ExperimentalLiveCapture({
  itemType,
  onComplete,
}: ExperimentalLiveCaptureProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState('');
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const frameTimerRef = React.useRef<number | null>(null);
  const framesRef = React.useRef<string[]>([]);
  const frameHashesRef = React.useRef<Set<string>>(new Set());

  const cleanupStream = React.useCallback(() => {
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  React.useEffect(() => cleanupStream, [cleanupStream]);

  const captureFrame = React.useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement('canvas');
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
    const signature = dataUrl.slice(-120);
    if (frameHashesRef.current.has(signature)) {
      return;
    }

    frameHashesRef.current.add(signature);
    framesRef.current.push(dataUrl);
    if (framesRef.current.length > 12) {
      const removed = framesRef.current.shift();
      if (removed) {
        frameHashesRef.current.delete(removed.slice(-120));
      }
    }
  }, []);

  const processCapture = React.useCallback(async (audioBlob: Blob, frames: string[]) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'live-capture.webm');

    const transcribeResponse = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    if (!transcribeResponse.ok) {
      throw await parseApiError(transcribeResponse, 'Failed to transcribe audio');
    }
    const transcribeData = await parseApiResponse<{ transcript: string }>(transcribeResponse);

    const processResponse = await fetch('/api/process-live-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: transcribeData.transcript,
        frames: frames.map((dataUrl) => ({ dataUrl })),
        type: itemType,
      }),
    });
    if (!processResponse.ok) {
      throw await parseApiError(processResponse, 'Failed to process live capture');
    }
    await parseApiResponse(processResponse);
  }, [itemType]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: { ideal: 'environment' } },
      });

      streamRef.current = stream;
      framesRef.current = [];
      frameHashesRef.current = new Set();
      audioChunksRef.current = [];
      setError('');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      const audioStream = new MediaStream(stream.getAudioTracks());
      const mimeType = getAudioMimeType();
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await processCapture(audioBlob, [...framesRef.current]);
          toast({
            title: 'Live capture processed',
            description: 'Voice and camera context were converted into action items.',
          });
          onComplete();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to process live capture.';
          setError(message);
          toast({
            title: 'Live capture failed',
            description: message,
            variant: 'destructive',
          });
        } finally {
          cleanupStream();
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      captureFrame();
      frameTimerRef.current = window.setInterval(captureFrame, 500);
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera and microphone.';
      setError(message);
      cleanupStream();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-slate-950/95 p-3 text-white">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <WandSparkles className="h-4 w-4 text-amber-300" />
            Experimental Live Capture
          </div>
          <div className="text-xs text-slate-300">Camera frames sampled at 2 fps</div>
        </div>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-video w-full rounded-lg bg-slate-900 object-cover"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          variant={isRecording ? 'destructive' : 'default'}
          className="gap-2"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isProcessing ? 'Processing...' : isRecording ? 'Stop Capture' : 'Start Live Capture'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Uses your voice plus sampled frames to infer tasks from what is in view.
        </p>
      </div>
    </div>
  );
}
