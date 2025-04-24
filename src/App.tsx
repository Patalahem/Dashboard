import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getUrl, list, remove } from "aws-amplify/storage";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";

interface ImageItem {
  name: string;
  path: string;  // S3 key, e.g. "processed/foo.jpg" or "uploads/.../bar.jpg"
}

interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

function App() {
  const { user, signOut } = useAuthenticator();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [processedImages, setProcessedImages] = useState<ImageItem[]>([]);
  const [processedImageUrls, setProcessedImageUrls] = useState<{ [key: string]: string }>({});
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [s3ProcessedUrl, setS3ProcessedUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [mode, setMode] = useState<"airplane" | "ship" | "both">("both");
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE = "https://7m4p3mvyjr.us-east-1.awsapprunner.com";

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    try {
      // list user uploads
      const uploadedResult = await list({ path: `uploads/${user?.userId}/` });
      setImages(
        uploadedResult.items.map(file => ({
          name: file.path.split("/").pop() || "Unknown",
          path: file.path,
        }))
      );

      // list processed files
      const procResult = await list({ path: "processed/" });
      const procItems: ImageItem[] = [];
      const urls: { [key: string]: string } = {};

      for (const file of procResult.items) {
        const key = file.path;
        procItems.push({
          name: key.split("/").pop() || "Unknown",
          path: key,
        });
        const { url } = await getUrl({ path: key });
        urls[key] = url.toString();
      }
      setProcessedImages(procItems);
      setProcessedImageUrls(urls);
    } catch (err) {
      console.error("Error fetching images:", err);
    }
  }

  function viewImage(path: string) {
    setSelectedImageName(path.split("/").pop() || null);
    setS3ProcessedUrl(null);
    setDetections(null);
  }

  function viewProcessed(path: string) {
    setS3ProcessedUrl(processedImageUrls[path]);
    setDetections(null);
  }

  async function processImage() {
    if (!selectedImageName) return;
    setIsProcessing(true);
    try {
      const key = `uploads/${user?.userId}/${selectedImageName}`;
      const { url } = await getUrl({ path: key });
      const blob = await fetch(url).then(r => r.blob());
      const form = new FormData();
      form.append("image", blob, selectedImageName);
      form.append("mode", mode);
      const resp = await fetch(`${API_BASE}/detect`, { method: "POST", body: form });
      const data = await resp.json();
      if (resp.ok && data.s3_url) {
        setS3ProcessedUrl(data.s3_url);
        setDetections(data.detections);
        await fetchImages();
      } else {
        console.warn("Detection error:", data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }

  // Single deleteImage for both uploads and processed
  async function deleteImage(path: string) {
    try {
      await remove(path);
      await fetchImages();
      // clear viewer if that item was showing
      if (processedImageUrls[path] === s3ProcessedUrl) {
        setS3ProcessedUrl(null);
        setDetections(null);
      }
      if (selectedImageName && path.endsWith(selectedImageName)) {
        setSelectedImageName(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo">SARenity</h1>
        <div className="user-info">
          <span>{user?.signInDetails?.loginId}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>
      <div className="content">
        <div className="sidebar">
          <h2>Upload an Image</h2>
          <FileUploader
            acceptedFileTypes={["image/*"]}
            path={`uploads/${user?.userId}/`}
            isResumable
            onUploadSuccess={(evt) => {
              fetchImages();
              viewImage(evt.key!);
            }}
          />

          <h3>Your Uploads</h3>
          <table>
            <thead>
              <tr><th>Name</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {images.map(img => (
                <tr key={img.path}>
                  <td>{img.name.slice(0, 8)}</td>
                  <td>
                    <button onClick={() => viewImage(img.path)}>Select</button>
                    <button onClick={() => deleteImage(img.path)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Processed Images</h3>
          <table>
            <thead>
              <tr><th>Name</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {processedImages.map(img => (
                <tr key={img.path}>
                  <td>{img.name.slice(0, 8)}</td>
                  <td>
                    <button onClick={() => viewProcessed(img.path)}>View</button>
                    <a href={processedImageUrls[img.path]} download={img.name}>
                      <button>Download</button>
                    </a>
                    <button onClick={() => deleteImage(img.path)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="image-viewer">
          <h2>Image Processing</h2>
          {!selectedImageName && !s3ProcessedUrl ? (
            <p>Select or upload an image to process</p>
          ) : (
            <>
              {selectedImageName && (
                <p><strong>Selected:</strong> {selectedImageName}</p>
              )}
              <label>
                Mode:
                <select value={mode} onChange={e => setMode(e.target.value as any)}>
                  <option value="airplane">Airplane</option>
                  <option value="ship">Ship</option>
                  <option value="both">Both</option>
                </select>
              </label>
              {selectedImageName && (
                <button onClick={processImage} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Run Detection"}
                </button>
              )}
              {s3ProcessedUrl && (
                <div>
                  <h3>Result</h3>
                  <img src={s3ProcessedUrl} alt="Result" style={{ maxWidth: "100%" }} />
                  {detections && (
                    <ul>
                      {detections.map((d, i) => (
                        <li key={i}>
                          <strong>{d.class}</strong> – {(d.confidence * 100).toFixed(1)}%
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
