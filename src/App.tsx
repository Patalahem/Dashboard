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

function App() {
  const { user, signOut } = useAuthenticator();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"airplane" | "ship" | "both">("both");
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE = "http://100.25.202.138:8080"; // ← Replace with your Flask API URL

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    try {
      const result = await list({ path: `uploads/${user?.userId}/` });
      const imageList = result.items.map((file) => ({
        name: file.path.split("/").pop() || "Unknown",
        path: file.path,
      }));
      setImages(imageList);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  }

  async function viewImage(path: string) {
    try {
      //const url = await getUrl({ path });
      const name = path.split("/").pop() || "";
      setSelectedImageName(name);
      setProcessedImageUrl(null); // Clear previous results
    } catch (error) {
      console.error("Error loading image:", error);
    }
  }

  async function processImage() {
    if (!selectedImageName) return;

    setIsProcessing(true);
    try {
      const url = await getUrl({
        path: `uploads/${user?.userId}/${selectedImageName}`,
      });

      const formData = new FormData();
      formData.append("image", await fetch(url.url.toString()).then(res => res.blob()), selectedImageName);
      formData.append("mode", mode);

      const response = await fetch(`${API_BASE}/detect`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Inference failed");

      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      setProcessedImageUrl(objectURL);
    } catch (error) {
      console.error("Error processing image:", error);
      setProcessedImageUrl(null);
    } finally {
      setIsProcessing(false);
    }
  }

  async function deleteImage(path: string) {
    try {
      await remove({ path });
      setImages(images.filter((image) => image.path !== path));
      setSelectedImageName(null);
      setProcessedImageUrl(null);
    } catch (error) {
      console.error("Error deleting image:", error);
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
            onUploadSuccess={() => fetchImages()}
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
              {processedImageUrl && (
                <div>
                  <h3>Result</h3>
                  <img src={processedImageUrl} alt="Detected" style={{ maxWidth: "100%" }} />
                </div>
              )}
            </>
          ) : (
            <p>Select an image to process</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
