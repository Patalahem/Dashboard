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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [detectionResults, setDetectionResults] = useState<Detection[] | null>(null);

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
      const url = await getUrl({ path });
      const name = path.split("/").pop() || "";
      setSelectedImageUrl(url.url.toString());
      setSelectedImageName(name);
      fetchDetectionResults(name);
    } catch (error) {
      console.error("Error loading image:", error);
    }
  }

  async function fetchDetectionResults(imageName: string) {
    try {
      const resultUrl = await getUrl({
        path: `processed-results/${imageName.replace(/\.[^/.]+$/, "")}.json`,
      });
      const response = await fetch(resultUrl.url.toString());
      const data = await response.json();
      setDetectionResults(data);
    } catch (err) {
      console.warn("Detection results not found yet.");
      setDetectionResults(null);
    }
  }

  async function deleteImage(path: string) {
    try {
      await remove({ path });
      setImages(images.filter((image) => image.path !== path));
      if (selectedImageUrl === path) {
        setSelectedImageUrl(null);
        setDetectionResults(null);
      }
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
          {/* Upload Section First */}
          <h2>Upload an Image</h2>
          <FileUploader
            acceptedFileTypes={["image/*"]}
            path={`uploads/${user?.userId}/`}
            maxFileCount={1}
            isResumable
            onUploadSuccess={() => fetchImages()}
          />

          {/* Table of Images */}
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
                    <button onClick={() => viewImage(image.path)}>View</button>
                    <button onClick={() => deleteImage(image.path)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="image-viewer">
          <h2>Image Preview</h2>
          {selectedImageUrl ? (
            <>
              <img src={selectedImageUrl} alt="Selected" />
              <div className="inference-results">
                <h3>Detections:</h3>
                {detectionResults ? (
                  <ul>
                    {detectionResults.map((det, index) => (
                      <li key={index}>
                        <strong>{det.class}</strong> — Confidence:{" "}
                        {(det.confidence * 100).toFixed(1)}%
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No detections found for this image.</p>
                )}
              </div>
            </>
          ) : (
            <p>Select an image to view</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
