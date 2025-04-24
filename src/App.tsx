import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getUrl, list, remove } from "aws-amplify/storage";
import { FileUploader } from "@aws-amplify/ui-react-storage";
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

  // Point to your App Runner HTTPS domain
  const API_BASE = "https://7m4p3mvyjr.us-east-1.awsapprunner.com";

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    try {
      const uploadedResult = await list({ path: `uploads/${user?.userId}/` });
      const uploadedList = uploadedResult.items.map((file) => ({
        name: file.path.split("/").pop() || "Unknown",
        path: file.path,
      }));
      setImages(uploadedList);

      const processedResult = await list({ path: "processed/" });
      const processedList: ImageItem[] = [];
      const urls: { [key: string]: string } = {};

      for (const file of processedResult.items) {
        const name = file.path.split("/").pop() || "Unknown";
        processedList.push({ name, path: file.path });

        const urlRes = await getUrl({ path: file.path });
        urls[file.path] = urlRes.url.toString();
      }

      setProcessedImages(processedList);
      setProcessedImageUrls(urls);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  }

  function viewImage(path: string) {
    const name = path.split("/").pop() || "";
    setSelectedImageName(name);
    setS3ProcessedUrl(null);
    setDetections(null);
  }

  async function processImage() {
    if (!selectedImageName) {
      console.warn("No image selected for processing");
      return;
    }
    setIsProcessing(true);

    try {
      const { url } = await getUrl({ path: `uploads/${user?.userId}/${selectedImageName}` });
      const blob = await fetch(url.toString()).then((res) => res.blob());

      const formData = new FormData();
      formData.append("image", blob, selectedImageName);
      formData.append("mode", mode);

      const response = await fetch(`${API_BASE}/detect`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.s3_url) {
        setS3ProcessedUrl(data.s3_url);
        setDetections(data.detections);
        fetchImages();
      } else {
        console.warn("Detection failed or incomplete response:", data);
      }
    } catch (err) {
      console.error("Detection error:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function deleteImage(path: string) {
    try {
      await remove({ path });
      setImages(images.filter((img) => img.path !== path));
      setSelectedImageName(null);
      setS3ProcessedUrl(null);
      setDetections(null);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }

  async function deleteProcessedImage(path: string) {
    try {
      await remove({ path });
      setProcessedImages(processedImages.filter((img) => img.path !== path));
      setProcessedImageUrls((urls) => {
        const copy = { ...urls };
        delete copy[path];
        return copy;
      });
      if (s3ProcessedUrl && processedImageUrls[path] === s3ProcessedUrl) {
        setS3ProcessedUrl(null);
        setDetections(null);
      }
    } catch (error) {
      console.error("Error deleting processed image:", error);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo">SARenity</h1>
        <div className="user-info">
          <span className="user-email">{user?.signInDetails?.loginId}</span>
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
            onUploadSuccess={(event) => {
              fetchImages();
              viewImage(event.key!);
            }}
          />

          <table>
            <thead>
              <tr>
                <th>Image Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image) => (
                <tr key={image.path}>
                  <td>{image.name}</td>
                  <td>
                    <button onClick={() => viewImage(image.path)}>Select</button>
                    <button onClick={() => deleteImage(image.path)}>Delete</button>
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
                <th>Preview</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedImages.map((img) => (
                <tr key={img.path}>
                  <td>{img.name}</td>
                  <td>
                    {processedImageUrls[img.path] ? (
                      <img
                        src={processedImageUrls[img.path]}
                        alt={img.name}
                        style={{ width: "100px", height: "auto", border: "1px solid #ccc" }}
                      />
                    ) : (
                      "Loading..."
                    )}
                  </td>
                  <td>
                    <button onClick={() => deleteProcessedImage(img.path)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="image-viewer">
          <h2>Image Processing</h2>
          {selectedImageName ? (
            <>
              <p><strong>Selected:</strong> {selectedImageName}</p>
              <label>
                Detection Mode:
                <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                  <option value="airplane">Airplane</option>
                  <option value="ship">Ship</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <button onClick={processImage} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Run Detection"}
              </button>

              {s3ProcessedUrl && (
                <div>
                  <h3>Result</h3>
                  <img src={s3ProcessedUrl} alt="Processed result" style={{ maxWidth: "100%" }} />
                  {detections && (
                    <>
                      <h4>Detections:</h4>
                      <ul>
                        {detections.map((det, idx) => (
                          <li key={idx}>
                            <strong>{det.class}</strong> — Confidence: {(det.confidence * 100).toFixed(1)}%
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>Select or upload an image to process</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
