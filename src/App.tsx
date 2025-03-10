import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import TodoTable from "./components/TodoTable";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { getUrl, list } from "aws-amplify/storage";
//import { Amplify } from "aws-amplify";
//import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

//Amplify.configure(outputs);

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const subscription = client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchImage();
    }
  }, [user]);

  async function fetchImage() {
    try {
      const files = await list({ path: `profile-pictures/${user?.userId}/` });

      if (files.items.length > 0) {
        const latestFile = files.items[0].path; // Get first file
        const url = await getUrl({ path: latestFile });
        setImageUrl(url.url.toString());
      } else {
        console.warn("No images found.");
      }
    } catch (error) {
      console.error("Error fetching image:", error);
    }
  }

  function createTodo() {
    const content = window.prompt("Todo content");
    if (content) {
      client.models.Todo.create({ content });
    }
  }

  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }

  function handleDoubleClick(todo: Schema["Todo"]["type"]) {
    setEditingId(todo.id);
    setEditContent(todo.content ?? "");
  }

  function handleEditChange(event: React.ChangeEvent<HTMLInputElement>) {
    setEditContent(event.target.value);
  }

  function handleEditBlur(todo: Schema["Todo"]["type"]) {
    if (editContent.trim() !== "") {
      client.models.Todo.update({ id: todo.id, content: editContent });
    }
    setEditingId(null);
  }

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s todos</h1>
      <button onClick={createTodo}>+ New</button>
      <TodoTable
        todos={todos}
        editingId={editingId}
        editContent={editContent}
        handleDoubleClick={handleDoubleClick}
        handleEditChange={handleEditChange}
        handleEditBlur={handleEditBlur}
        deleteTodo={deleteTodo}
      />
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
      <button onClick={signOut}>Sign out</button>
      
      <h2>Upload an Image</h2>
      <FileUploader
        acceptedFileTypes={["image/*"]}
        path={`profile-pictures/${user?.userId}/`}
        maxFileCount={1}
        isResumable
        onUploadSuccess={() => fetchImage()} // Refresh image after upload
      />
      
      {imageUrl && (
        <div>
          <h2>Uploaded Image</h2>
          <img src={imageUrl} alt="Uploaded" style={{ maxWidth: "300px" }} />
        </div>
      )}
    </main>
  );
}

export default App;
