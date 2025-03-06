import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import TodoTable from "./components/TodoTable";


const client = generateClient<Schema>();

function App() {
  const { signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  useEffect(() => {
    const subscription = client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
    return () => subscription.unsubscribe();
  }, []);

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
      <h1>My Todos</h1>
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
    </main>
  );
}

export default App;
