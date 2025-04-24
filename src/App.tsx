import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getUrl, list, remove } from "aws-amplify/storage";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { FaDownload, FaTrash } from "react-icons/fa";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";

interface ImageItem {
  name: string;
  path: string;
}

interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

// common button style
const actionButtonStyle: React.CSSProperties = {
  backgroundColor: "#555", // darkish gray
  color: "#fff",
  border: "none",
  padding: "6px",
  borderRadius: "4px",
  cursor: "pointer",
  margin: "0 4px",
};

function App() {
  const { user, signOut } = useAuthenticator();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [processedImages, setProcessedImages] = useState<ImageItem[]>([]);
  const [processedImageUrls, setProcessedImageUrls] = useState<{ [key: string]: string }>({});
  const [processedDetections, setProcessedDetections] = useState<{
    [key: string]: Detection[];
  }>({});
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
      // list uploads
      const up = await list({ path: `uploads/${user?.userId}/` });
      setImages(
        up.items.map((f) => ({
          name: f.path.split("/").pop() || "Unknown",
          path: f.path,
        }))
      );

      // list processed
      const pr = await list({ path: "processed/" });
      const pi: ImageItem[] = [];
      const urls: { [key: string]: string } = {};
      for (const f of pr.items) {
        pi.push({
          name: f.path.split("/").pop() || "Unknown",
          path: f.path,
        });
        const { url } = await getUrl({ path: f.path });
        urls[f.path] = url.toString();
      }
      setProcessedImages(pi);
      setProcessedImageUrls(urls);
    } catch (err) {
      console.error("Error fetching images:", err);
    }
  }

  function viewUpload(path: string) {
    setSelectedImageName(path.split("/").pop() || null);
    setS3ProcessedUrl(null);
    setDetections(null);
  }

  function viewProcessed(path: string) {
    setS3ProcessedUrl(processedImageUrls[path]);
    setSelectedImageName(null);
    setDetections(processedDetections[path] || null);
  }

  async function processImage() {
    if (!selectedImageName) return;
    setIsProcessing(true);
    try {
      const key = `uploads/${user?.userId}/${selectedImageName}`;
      const { url } = await getUrl({ path: key });
      const blob = await fetch(url).then((r) => r.blob());
      const form = new FormData();
      form.append("image", blob, selectedImageName);
      form.append("mode", mode);

      const r = await fetch(`${API_BASE}/detect`, {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      if (r.ok && data.s3_url) {
        const procKey = `processed/${data.filename}`;
        // store URL
        setS3ProcessedUrl(data.s3_url);
        // store detections for this image
        setProcessedDetections((prev) => ({
          ...prev,
          [procKey]: data.detections,
        }));
        setDetections(data.detections);
        await fetchImages();
      } else {
        console.warn("Detection failed:", data);
      }
    } catch (e) {
      console.error("Detection error:", e);
    } finally {
      setIsProcessing(false);
    }
  }

  async function deleteImage(path: string) {
    try {
      await remove({ path });
      await fetchImages();
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
            maxFileCount={1}
            isResumable
            onUploadSuccess={(evt) => {
              fetchImages();
              viewUpload(evt.key!);
            }}
          />

          <h3>Your Uploads</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.path}>
                  <td>{img.name}</td>
                  <td>
                    <button
                      style={actionButtonStyle}
                      onClick={() => viewUpload(img.path)}
                    >
                      Select
                    </button>
                    <button
                      style={actionButtonStyle}
                      onClick={() => deleteImage(img.path)}
                      aria-label="Delete upload"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Processed Images</h3>
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedImages.map((img) => (
                <tr key={img.path}>
                  <td>{img.name.slice(0, 8)}</td>
                  <td>
                    <button
                      style={actionButtonStyle}
                      onClick={() => viewProcessed(img.path)}
                    >
                      View
                    </button>
                    <a
                      href={processedImageUrls[img.path]}
                      download={img.name}
                      style={actionButtonStyle}
                      aria-label="Download processed image"
                    >
                      <FaDownload />
                    </a>
                    <button
                      style={actionButtonStyle}
                      onClick={() => deleteImage(img.path)}
                      aria-label="Delete processed image"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="image-viewer">
          <h2>Viewer</h2>
          {!selectedImageName && !s3ProcessedUrl && (
            <p>Select or upload an image to process</p>
          )}

          {selectedImageName && (
            <>
              <p>
                <strong>Selected:</strong> {selectedImageName}
              </p>
              <label>
                Mode:
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                >
                  <option value="airplane">Airplane</option>
                  <option value="ship">Ship</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <button onClick={processImage} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Run Detection"}
              </button>
            </>
          )}

          {s3ProcessedUrl && (
            <>
              <img
                src={s3ProcessedUrl}
                alt="Processed"
                style={{ maxWidth: "100%", marginBottom: "16px" }}
              />

              {detections && (
                <>
                  <h4>Detected Objects</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Confidence</th>
                        <th>Bounding Box</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detections.map((d, i) => (
                        <tr key={i}>
                          <td>{d.class}</td>
                          <td>{(d.confidence * 100).toFixed(1)}%</td>
                          <td>
                            [{d.bbox[0]}, {d.bbox[1]}, {d.bbox[2]},{" "}
                            {d.bbox[3]}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
