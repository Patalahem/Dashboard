import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getUrl, list, remove } from "aws-amplify/storage";
import { FileUploader } from "@aws-amplify/ui-react-storage";
//import { Amplify } from "aws-amplify";
//import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./index.css"; // Import styling

//Amplify.configure(outputs);

interface ImageItem {
  name: string;
  path: string;
}

function App() {
  const { user, signOut } = useAuthenticator();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch list of images on load
  useEffect(() => {
    fetchImages();
  }, []);

  // Fetch all uploaded images
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

  // View selected image
  async function viewImage(path: string) {
    try {
      const url = await getUrl({ path });
      setSelectedImage(url.url.toString());
    } catch (error) {
      console.error("Error loading image:", error);
    }
  }

  // Delete an image
  async function deleteImage(path: string) {
    try {
      await remove({ path });
      setImages(images.filter((image) => image.path !== path));
      if (selectedImage === path) setSelectedImage(null);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1>{user?.signInDetails?.loginId} SARenity</h1>
        <button onClick={signOut}>Sign out</button>
      </header>

      {/* Main Layout */}
      <div className="content">
        {/* Left: Image List & Upload */}
        <div className="sidebar">
          <h2>Uploaded Images</h2>
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

          {/* Image Upload Section */}
          <h2>Upload an Image</h2>
          <FileUploader
            acceptedFileTypes={["image/*"]}
            path={`uploads/${user?.userId}/`}
            maxFileCount={1}
            isResumable
            onUploadSuccess={() => fetchImages()} // Refresh list after upload
          />
        </div>

        {/* Right: Image Viewing Section */}
        <div className="image-viewer">
          <h2>Image Preview</h2>
          {selectedImage ? (
            <img src={selectedImage} alt="Selected" />
          ) : (
            <p>Select an image to view</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
