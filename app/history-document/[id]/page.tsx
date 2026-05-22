"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

type DocumentItem = {
  id: number;
  prodnum: string;
  created_at: string;
  filename?: string;
};

export default function DetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<DocumentItem | null>(null);

  /* ===== HELPER ===== */
  const formatWIB = (dateStr: string) => {
    if (!dateStr) return "-";

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return dateStr;

    const day   = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year  = date.getUTCFullYear();
    const hour  = String(date.getUTCHours()).padStart(2, "0");
    const min   = String(date.getUTCMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hour}:${min}`;
  };

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`http://localhost:5000/prodnum/${id}`);
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchDetail();
  }, [id]);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-xl bg-white shadow-md md:max-w-2xl p-6 mt-6">
      <h1 className="text-xl font-bold">Detail Dokumen</h1>

      <div className="mt-4">
        <p>
          <b>Prodnum:</b> {data.prodnum}
        </p>
        <p>
          <b>Date:</b> {formatWIB(data.created_at)}
        </p>

        {data.filename && (
          <div className="mt-4 flex justify-center">
            <Image
              src={`http://localhost:5000/uploads/${data.filename}`}
              alt="Document"
              width={256}
              height={256}
              className="border rounded"
              unoptimized
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {/* Rename */}
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={async () => {
            const newName = prompt("Masukkan nama dokumen baru:", data.prodnum);
            if (!newName || newName === data.prodnum) return;
            try {
              const res = await fetch(`http://localhost:5000/prodnum/${id}/rename`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prodnum: newName }),
              });
              if (res.ok) {
                setData({ ...data, prodnum: newName });
                alert("Nama dokumen berhasil diubah.");
              } else {
                alert("Gagal mengganti nama dokumen.");
              }
            } catch (err) {
              console.error(err);
              alert("Terjadi kesalahan saat mengganti nama.");
            }
          }}
        >
          Rename
        </button>

        {/* Review */}
        {data.filename && (
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => {
              window.open(`http://localhost:5000/uploads/${data.filename}`, "_blank");
            }}
          >
            Review Foto
          </button>
        )}

        {/* Delete */}
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={async () => {
            if (!confirm("Yakin ingin menghapus dokumen ini?")) return;
            try {
              const res = await fetch(`http://localhost:5000/prodnum/${id}`, {
                method: "DELETE",
              });
              if (res.ok) {
                alert("Dokumen berhasil dihapus.");
                window.location.href = "/history-document";
              } else {
                alert("Gagal menghapus dokumen.");
              }
            } catch (err) {
              console.error(err);
              alert("Terjadi kesalahan saat menghapus dokumen.");
            }
          }}
        >
          Delete
        </button>

        {/* Back */}
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={() => window.history.back()}
        >
          Back
        </button>
      </div>
    </div>
  );
}