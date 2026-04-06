"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";

// ===== MAIN COMPONENT =====
export default function Home() {
  // ===== STATE & REFS =====
  const [cameraOpen, setCameraOpen] = useState(false);
  const orientation = "portrait";
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCaptureRef = useRef<ImageCapture | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  // ===== CAMERA OPEN EFFECT =====
  useEffect(() => {
    if (!cameraOpen) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" }, // Use rear camera if available
            width: { ideal: 1920 }, // Full HD
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Setup ImageCapture
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          imageCaptureRef.current = new window.ImageCapture(videoTrack);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraOpen]);

  // ===== PHOTO CAPTURE FUNCTION - SAVE TO INTERNAL STORAGE =====
  const capturePhoto = useCallback(() => {
    if (!imageCaptureRef.current || !canvasRef.current) return;

    imageCaptureRef.current
      .takePhoto()
      .then((blob) => {
        const img = new window.Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const imgWidth = img.width;
          const imgHeight = img.height;

          // ===== Rasio A4 Portrait =====
          const a4Ratio = 1 / 1.414;

          let cropWidth = imgWidth;
          let cropHeight = imgWidth / a4Ratio;

          if (cropHeight > imgHeight) {
            cropHeight = imgHeight;
            cropWidth = imgHeight * a4Ratio;
          }

          const cropX = (imgWidth - cropWidth) / 2;
          const cropY = (imgHeight - cropHeight) / 2;

          // ===== Ukuran Output A4 HD =====
          canvas.width = 1240;
          canvas.height = 1754;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            canvas.width,
            canvas.height,
          );

          const finalImage = canvas.toDataURL("image/jpeg", 0.95);

          setPhotos((prev) => [...prev, finalImage]);

          URL.revokeObjectURL(url);
        };

        img.src = url;
      })
      .catch((err) => {
        console.error("Failed to capture photo:", err);
      });
  }, []);

  // ===== PHOTO TRIGGER - KEYDOWN EVENT LISTENER =====
  useEffect(() => {
    if (!cameraOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Trigger photo capture on Space or Enter key
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        capturePhoto();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [cameraOpen, capturePhoto]);

  // ===== END PHOTO TRIGGER =====

  const handleSubmit = async () => {
    try {
      const formData = new FormData();

      photos.forEach((photo) => {
        formData.append("images", photo);
      });

      const response = await fetch("http://localhost:5000/prodnum", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(`Upload berhasil! ${result.totalFiles} file terkirim`);
        setPhotos([]);
      } else {
        alert("Upload gagal");
      }
    } catch (error) {
      alert("Terjadi error saat upload");
      console.error("Upload error:", error);
    }
  };
  // ===== RENDER UI =====
  return (
    <>
      {/* ===== HIDDEN CANVAS FOR PHOTO CAPTURE ===== */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-row gap-6 px-4 py-6 mt-6">
        {/* ===== CAMERA SECTION ===== */}
        <div className="basis-1/3 text-center bg-white rounded-xl shadow px-4 py-6">
          <h1 className="text-1xl font-bold px-[30px] mt-8">
            Sesuaikan File/Dokumen📄
          </h1>
          {cameraOpen && (
            <div>
              {/* ===== CAMERA VIEW ===== */}
              <div className="mt-4 flex justify-center">
                <div
                  className="relative bg-black rounded-lg overflow-hidden"
                  style={{
                    width: orientation === "portrait" ? "60%" : "80%",
                    maxWidth: "500px",
                    aspectRatio:
                      orientation === "portrait" ? "1 / 1.414" : "1.414 / 1",
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute border-4 border-lime-400 rounded-lg pointer-events-none" />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Tekan SPACE atau ENTER untuk mengambil foto
              </p>
            </div>
          )}
          <button
            onClick={() => setCameraOpen(!cameraOpen)}
            className="text-black px-6 py-3 rounded-[10px] inline-block border mt-4 mx-auto block cursor-pointer hover:bg-gray-100"
          >
            {cameraOpen ? "Close Camera" : "Open Camera"}
          </button>
        </div>

        {/* ===== PREVIEW LIST ===== */}
        {photos.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold mb-2">
              Foto Tersimpan ({photos.length})
            </h2>

            <div className="grid grid-cols-5 gap-2 bg-white rounded-xl shadow px-4 py-6">
              {photos.map((photo, index) => (
                <Image
                  key={index}
                  src={photo}
                  alt={`Preview ${index}`}
                  width={150}
                  height={200}
                  className="rounded border object-contain"
                />
              ))}
            </div>

            {/* ===== SUBMIT BUTTON ===== */}
            {photos.length > 0 && (
              <div className="flex gap-3 mt-4 justify-center">
                <button
                  className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600"
                  onClick={handleSubmit}
                >
                  Submit Semua
                </button>

                <button
                  className="px-4 py-2 rounded-lg bg-gray-300 text-black font-semibold hover:bg-gray-400"
                  onClick={() => setPhotos([])}
                >
                  Hapus Semua
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
