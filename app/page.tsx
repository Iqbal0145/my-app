"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// ===== TYPES =====
type PhotoStatus = "pending" | "success" | "failed" | "duplicate";

interface PhotoItem {
  dataUrl: string;
  status: PhotoStatus;
  message: string;
  prodnum: string;
  barcodeFound: boolean;
}

export default function Home() {
  // ===== STATE & REFS =====
  const [cameraOpen, setCameraOpen] = useState(false);
  const orientation = "portrait";
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCaptureRef = useRef<ImageCapture | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  useEffect(() => {
    if (!cameraOpen) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
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

  // ===== PHOTO CAPTURE =====
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
          const a4Ratio = 1 / 1.414;
          let cropWidth = imgWidth;
          let cropHeight = imgWidth / a4Ratio;
          if (cropHeight > imgHeight) {
            cropHeight = imgHeight;
            cropWidth = imgHeight * a4Ratio;
          }
          const cropX = (imgWidth - cropWidth) / 2;
          const cropY = (imgHeight - cropHeight) / 2;

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

          // SESUAIKAN: sinkronkan dengan posisi kotak biru di UI
          const roiWidthPct = 0.15;
          const roiHeightPct = 0.1;
          const roiRightPct = 0.03;
          const roiBottomPct = 0.19;

          const roiWidth = canvas.width * roiWidthPct;
          const roiHeight = canvas.height * roiHeightPct;
          const roiX = canvas.width - (roiWidth + canvas.width * roiRightPct);
          const roiY =
            canvas.height - (roiHeight + canvas.height * roiBottomPct);

          const barcodeCanvas = document.createElement("canvas");
          const scale = 5;
          barcodeCanvas.width = roiWidth * scale;
          barcodeCanvas.height = roiHeight * scale;

          const bctx = barcodeCanvas.getContext("2d");
          if (!bctx) return;

          bctx.filter = "contrast(1.5) grayscale(1)";
          bctx.drawImage(
            canvas,
            roiX,
            roiY,
            roiWidth,
            roiHeight,
            0,
            0,
            barcodeCanvas.width,
            barcodeCanvas.height,
          );

          const codeReader = new BrowserMultiFormatReader();
          const imageDataUrl = barcodeCanvas.toDataURL("image/png");
          const finalImage = canvas.toDataURL("image/jpeg", 0.95);

          codeReader
            .decodeFromImageUrl(imageDataUrl)
            .then((result) => {
              const barcodeText = result.getText();
              console.log("Barcode:", barcodeText);
              setPhotos((prev) => [
                ...prev,
                {
                  dataUrl: finalImage,
                  status: "pending",
                  message: "Barcode terbaca",
                  prodnum: barcodeText,
                  barcodeFound: true,
                },
              ]);
            })
            .catch(() => {
              console.log("Barcode tidak terbaca");
              setPhotos((prev) => [
                ...prev,
                {
                  dataUrl: finalImage,
                  status: "pending",
                  message:
                    "Barcode tidak terbaca - isi nomor produksi secara manual",
                  prodnum: "",
                  barcodeFound: false,
                },
              ]);
            });

          URL.revokeObjectURL(url);
        };

        img.src = url;
      })
      .catch((err) => console.error("Capture gagal:", err));
  }, []);

  // ===== KEYDOWN TRIGGER =====
  useEffect(() => {
    if (!cameraOpen) return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        capturePhoto();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [cameraOpen, capturePhoto]);

  // ===== UPDATE PRODNUM PER FOTO =====
  const handleProднumChange = (index: number, value: string) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, prodnum: value } : p)),
    );
  };

  // ===== SUBMIT PER FOTO =====
  const handleSubmitSingle = async (index: number) => {
    const photo = photos[index];

    if (!photo.prodnum.trim()) {
      alert(`Nomor produksi foto #${index + 1} tidak boleh kosong.`);
      return;
    }

    // ✅ Validasi di frontend — cek apakah nomor sudah ada di foto lain
    const isDuplicateLocal = photos.some(
      (p, i) => i !== index && p.prodnum.trim() === photo.prodnum.trim(),
    );

    if (isDuplicateLocal) {
      setPhotos((prev) =>
        prev.map((p, i) =>
          i === index
            ? {
                ...p,
                status: "duplicate",
                message: `Nomor '${photo.prodnum}' sudah ada di foto lain dalam daftar ini`,
              }
            : p,
        ),
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/prodnum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: photo.dataUrl,
          manualName: photo.barcodeFound ? null : photo.prodnum,
        }),
      });

      const result = await response.json();

      if (response.status === 409) {
        setPhotos((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  status: "duplicate",
                  message: `Nomor '${photo.prodnum}' sudah pernah dikirim sebelumnya`,
                }
              : p,
          ),
        );
        return;
      }

      if (result.success) {
        setPhotos((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  status: "success",
                  message: `Berhasil dikirim: ${result.prodnum}`,
                }
              : p,
          ),
        );
      } else {
        setPhotos((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  status: "failed",
                  message: result.message || "Gagal dikirim",
                }
              : p,
          ),
        );
      }
    } catch {
      setPhotos((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, status: "failed", message: "Error koneksi" }
            : p,
        ),
      );
    }
  };

  // ===== STATUS BADGE =====
  const statusBadge = (status: PhotoStatus, barcodeFound: boolean) => {
    if (status === "success")
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500 text-white">
          Berhasil
        </span>
      );
    if (status === "failed")
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white">
          Gagal
        </span>
      );
    if (status === "duplicate")
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500 text-white">
          Duplikat
        </span>
      );
    if (barcodeFound)
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500 text-white">
          Barcode Terbaca
        </span>
      );
    return (
      <span className="text-[10px] px-2 py-0.5 rounded bg-gray-400 text-white">
        Isi Manual
      </span>
    );
  };

  // ===== RENDER =====
  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-row gap-6 px-4 py-6 mt-6">
        {/* CAMERA SECTION */}
        <div className="basis-1/3 text-center bg-white rounded-xl shadow px-4 py-6">
          <h1 className="text-1xl font-bold px-[30px] mt-8">
            Sesuaikan File/Dokumen
          </h1>

          {cameraOpen && (
            <div>
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
                  {/* Kotak biru untuk area barcode */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "19%",
                      right: "3%",
                      width: "15%",
                      height: "10%",
                      border: "2px solid blue",
                      pointerEvents: "none",
                    }}
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
            {cameraOpen ? "Tutup Kamera" : "Buka Kamera"}
          </button>
        </div>

        {/* PREVIEW LIST */}
        {photos.length > 0 && (
          <div className="mt-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                Foto Tersimpan ({photos.length})
              </h2>
              {/* Ringkasan status */}
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                  Berhasil:{" "}
                  {photos.filter((p) => p.status === "success").length}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  Belum kirim:{" "}
                  {photos.filter((p) => p.status === "pending").length}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
                  Gagal: {photos.filter((p) => p.status === "failed").length}
                </span>
              </div>
            </div>

            {/* GRID FOTO DENGAN FORM */}
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-xl shadow p-3 flex flex-col gap-2 border-2 ${
                    photo.status === "success"
                      ? "border-green-400"
                      : photo.status === "failed"
                        ? "border-red-400"
                        : photo.status === "duplicate"
                          ? "border-yellow-400"
                          : !photo.barcodeFound
                            ? "border-gray-400"
                            : "border-blue-300"
                  }`}
                >
                  {/* Header foto */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">
                      Dokumen {index + 1}
                    </span>
                    {statusBadge(photo.status, photo.barcodeFound)}
                  </div>

                  {/* Gambar */}
                  <Image
                    src={photo.dataUrl}
                    alt={`Foto ${index + 1}`}
                    width={300}
                    height={400}
                    className="rounded object-contain w-full"
                  />

                  {/* Form nomor produksi */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">
                      Nomor Produksi
                      {!photo.barcodeFound && (
                        <span className="ml-1 text-gray-500 font-semibold">
                          (isi manual)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={photo.prodnum}
                      onChange={(e) =>
                        handleProднumChange(index, e.target.value)
                      }
                      disabled={
                        photo.barcodeFound || photo.status === "success"
                      }
                      placeholder={
                        photo.barcodeFound ? "" : "Masukkan nomor produksi"
                      }
                      className={`border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        photo.barcodeFound
                          ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                          : "bg-white text-gray-800"
                      } ${photo.status === "success" ? "opacity-50" : ""}`}
                    />
                    {/* Pesan status */}
                    <p
                      className={`text-[10px] ${
                        photo.status === "success"
                          ? "text-green-600"
                          : photo.status === "failed"
                            ? "text-red-600"
                            : "text-gray-400"
                      }`}
                    >
                      {photo.message}
                    </p>
                  </div>

                  {/* Tombol submit per foto */}
                  <button
                    className={`w-full py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      photo.status === "success"
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : photo.status === "duplicate"
                          ? "bg-yellow-500 text-white cursor-not-allowed"
                          : photo.status === "failed"
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                    onClick={() => handleSubmitSingle(index)}
                    disabled={
                      photo.status === "success" || photo.status === "duplicate"
                    }
                  >
                    {photo.status === "success"
                      ? "Terkirim"
                      : photo.status === "duplicate"
                        ? "Duplikat"
                        : photo.status === "failed"
                          ? "Kirim Ulang"
                          : "Kirim"}
                  </button>
                </div>
              ))}
            </div>

            {/* TOMBOL HAPUS SEMUA */}
            <div className="flex justify-center mt-4">
              <button
                className="px-4 py-2 rounded-lg bg-gray-300 text-black font-semibold hover:bg-gray-400"
                onClick={() => setPhotos([])}
              >
                Hapus Semua
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
