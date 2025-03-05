import React from "react";
import type { Schema } from "../../amplify/data/resource";

interface TodoTableProps {
  todos: Array<Schema["Todo"]["type"]>;
  editingId: string | null;
  editContent: string;
  handleDoubleClick: (todo: Schema["Todo"]["type"]) => void;
  handleEditChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleEditBlur: (todo: Schema["Todo"]["type"]) => void;
  deleteTodo: (id: string) => void;
}

const TodoTable: React.FC<TodoTableProps> = ({
  todos,
  editingId,
  editContent,
  handleDoubleClick,
  handleEditChange,
  handleEditBlur,
  deleteTodo,
}) => {
  return (
    <table border={1} cellPadding="5">
      <thead>
        <tr>
          <th>#</th>
          <th>Todo</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {todos.map((todo, index) => (
          <tr key={todo.id}>
            <td>{index + 1}</td>
            <td onDoubleClick={() => handleDoubleClick(todo)}>
              {editingId === todo.id ? (
                <input
                  type="text"
                  value={editContent}
                  onChange={handleEditChange}
                  onBlur={() => handleEditBlur(todo)}
                  autoFocus
                />
              ) : (
                todo.content
              )}
            </td>
            <td>
              <button onClick={() => deleteTodo(todo.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TodoTable;
