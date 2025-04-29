import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getUrl, list, remove } from "aws-amplify/storage";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { FaDownload, FaTrash, FaChevronDown, FaChevronRight } from "react-icons/fa";
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

const actionButtonStyle: React.CSSProperties = {
  backgroundColor: "#555",
  color: "#fff",
  border: "none",
  padding: "4px",
  borderRadius: "4px",
  cursor: "pointer",
  margin: "0 4px",
  height: "24px",
  width: "24px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const checkboxStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  verticalAlign: "middle",
};

function App() {
  const { user, signOut } = useAuthenticator();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [processedImages, setProcessedImages] = useState<ImageItem[]>([]);
  const [processedImageUrls, setProcessedImageUrls] = useState<{ [key: string]: string }>({});
  const [processedDetections, setProcessedDetections] = useState<{ [key: string]: Detection[] }>({});
  const [jsonFiles, setJsonFiles] = useState<ImageItem[]>([]);
  const [jsonFileUrls, setJsonFileUrls] = useState<{ [key: string]: string }>({});
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [s3ProcessedUrl, setS3ProcessedUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [selectedProcessedPaths, setSelectedProcessedPaths] = useState<string[]>([]);
  const [mode, setMode] = useState<"airplane" | "ship" | "both" | "combinedModel">("both");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadsExpanded, setUploadsExpanded] = useState(true);
  const [processedExpanded, setProcessedExpanded] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const API_BASE = "https://7m4p3mvyjr.us-east-1.awsapprunner.com";

  useEffect(() => {
    if (user) {
      const email = user?.signInDetails?.loginId;
      if (email && !email.endsWith("@udel.edu")) {
        alert("Access restricted to udel.edu emails only.");
        signOut();
      }
    }
  }, [user]);

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    try {
      const up = await list({ path: `uploads/${user?.userId}/` });
      setImages(up.items.map((f) => ({ name: f.path.split("/").pop() || "Unknown", path: f.path })));

      const pr = await list({ path: "processed/" });
      const imageFiles = pr.items.filter((f) => /\.(?:jpe?g|png|gif)$/i.test(f.path.split("/").pop() || ""));
      const jsonFiles = pr.items.filter((f) => /\.json$/i.test(f.path.split("/").pop() || ""));

      const imgs: ImageItem[] = [];
      const urls: Record<string, string> = {};
      const dets: Record<string, Detection[]> = {};

      await Promise.all(
        imageFiles.map(async (f) => {
          const name = f.path.split("/").pop()!;
          imgs.push({ name, path: f.path });

          const { url: imgUrl } = await getUrl({ path: f.path });
          urls[f.path] = imgUrl.toString();

          const base = name.replace(/_annotated\.\w+$/i, "");
          const jsonKey = `processed/${base}_detections.json`;

          try {
            const { url: jurl } = await getUrl({ path: jsonKey });
            const data: Detection[] = await fetch(jurl.toString()).then((r) => r.json());
            dets[f.path] = data;
          } catch {
            dets[f.path] = [];
          }
        })
      );

      setProcessedImages(imgs);
      setProcessedImageUrls(urls);
      setProcessedDetections(dets);

      setJsonFiles(jsonFiles.map((f) => ({ name: f.path.split("/").pop() || "Unknown", path: f.path })));

      const jsonUrls: Record<string, string> = {};
      for (const f of jsonFiles) {
        const { url } = await getUrl({ path: f.path });
        jsonUrls[f.path] = url.toString();
      }
      setJsonFileUrls(jsonUrls);
    } catch (err) {
      console.error("Error fetching images:", err);
    }
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

      const r = await fetch(`${API_BASE}/detect`, { method: "POST", body: form });
      const data = await r.json();

      if (r.ok && data.s3_url) {
        await fetchImages();
        setS3ProcessedUrl(data.s3_url);
        setDetections(data.detections);
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
      if (path.includes("_annotated")) {
        const base = path.replace(/_annotated\.\w+$/i, "");
        const jsonPath = `processed/${base}_detections.json`;
        try {
          await remove({ path: jsonPath });
        } catch (e) {
          console.warn("JSON file not found for deletion.");
        }
      }
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
              setSelectedImageName(evt.key!.split("/").pop() || null);
              setSelectedProcessedPaths([]);
              setS3ProcessedUrl(null);
              setDetections(null);
            }}
          />

          <h3 onClick={() => setUploadsExpanded(!uploadsExpanded)} style={{ cursor: "pointer" }}>
            {uploadsExpanded ? <FaChevronDown /> : <FaChevronRight />} Your Uploads
          </h3>
          {uploadsExpanded && (
            <table>
              <thead><tr><th>Name</th><th>Actions</th></tr></thead>
              <tbody>
                {images.map((img) => (
                  <tr key={img.path}>
                    <td>{img.name}</td>
                    <td>
                      <button
                        style={actionButtonStyle}
                        onClick={() => {
                          setSelectedImageName(img.name);
                          setSelectedProcessedPaths([]);
                          setS3ProcessedUrl(null);
                          setDetections(null);
                        }}
                      >Select</button>
                      <button style={actionButtonStyle} onClick={() => deleteImage(img.path)}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 onClick={() => setProcessedExpanded(!processedExpanded)} style={{ cursor: "pointer" }}>
            {processedExpanded ? <FaChevronDown /> : <FaChevronRight />} Processed Images
          </h3>
          {processedExpanded && (
            <table>
              <thead><tr><th>Select</th><th>Actions</th></tr></thead>
              <tbody>
                {processedImages.map((img) => (
                  <tr key={img.path} style={{ verticalAlign: "middle" }}>
                    <td style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        style={checkboxStyle}
                        checked={selectedProcessedPaths.includes(img.path)}
                        onChange={() => {
                          setSelectedImageName(null);
                          setSelectedProcessedPaths((prev) => {
                            if (prev.includes(img.path)) return prev.filter(p => p !== img.path);
                            if (prev.length >= 3) return prev;
                            return [...prev, img.path];
                          });
                        }}
                      />
                      <span style={{ marginLeft: "6px" }}>{img.name.slice(0, 8)}</span>
                    </td>
                    <td>
                      <a href={processedImageUrls[img.path]} download={img.name} style={actionButtonStyle}><FaDownload /></a>
                      <button style={actionButtonStyle} onClick={() => deleteImage(img.path)}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 onClick={() => setJsonExpanded(!jsonExpanded)} style={{ cursor: "pointer" }}>
            {jsonExpanded ? <FaChevronDown /> : <FaChevronRight />} JSON Files
          </h3>
          {jsonExpanded && (
            <table>
              <thead><tr><th>Filename</th><th>Download</th></tr></thead>
              <tbody>
                {jsonFiles.map((file) => (
                  <tr key={file.path}>
                    <td>{file.name}</td>
                    <td>
                      <a href={jsonFileUrls[file.path]} download={file.name} style={actionButtonStyle}><FaDownload /></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="image-viewer">
          <h2 style={{ textAlign: "left" }}>Viewer</h2>

          {!selectedImageName && selectedProcessedPaths.length === 0 && (
            <p>Select or upload an image to process or view</p>
          )}

          {selectedImageName && selectedProcessedPaths.length === 0 && (
            <>
              <p><strong>Selected:</strong> {selectedImageName}</p>
              <label>
                Mode:
                <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                  <option value="airplane">Airplane</option>
                  <option value="ship">Ship</option>
                  <option value="both">Both</option>
                  <option value="combinedModel">Combined</option>
                </select>
              </label>
              <button onClick={processImage} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Run Detection"}
              </button>
            </>
          )}

          {selectedProcessedPaths.length > 0 && (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {selectedProcessedPaths.map((path) => (
                <div key={path} style={{ flex: "1 1 30%", minWidth: "250px" }}>
                  <img src={processedImageUrls[path]} alt="Processed" style={{ width: "100%", marginBottom: "8px" }} />
                  {processedDetections[path] && (
                    <>
                      <h4>Detections</h4>
                      <table>
                        <thead>
                          <tr><th>Class</th><th>Confidence</th><th>Bounding Box</th></tr>
                        </thead>
                        <tbody>
                          {processedDetections[path].map((d, i) => (
                            <tr key={i}>
                              <td>{d.class}</td>
                              <td>{(d.confidence * 100).toFixed(1)}%</td>
                              <td>[{d.bbox.join(", ")}]</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
