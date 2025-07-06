import React, {
  useState,
  useEffect,
  useContext,
  useReducer,
  createContext,
  useMemo,
} from "react";
import "./KanbanBoard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const KanbanContext = createContext();

const initialState = {
  todo: [],
  inProgress: [],
  done: [],
};

function kanbanReducer(state, action) {
  switch (action.type) {
    case "LOAD_TASKS":
      return action.payload || initialState;

    case "ADD_TASK": {
      const { task } = action.payload || {};
      if (!task) return state;
      return {
        ...state,
        todo: [...state.todo, task],
      };
    }

    case "MOVE_TASK": {
      const { card, from, to } = action.payload || {};
      if (!card || !from || !to) return state;

      const updatedFrom = state[from].filter((c) => c.id !== card.id);
      const updatedTo = [...state[to], { ...card }];

      return {
        ...state,
        [from]: updatedFrom,
        [to]: updatedTo,
      };
    }

    case "DELETE_TASK": {
      const { cardId, from } = action.payload || {};
      if (!cardId || !from) return state;
      return {
        ...state,
        [from]: state[from].filter((card) => card.id !== cardId),
      };
    }

    default:
      return state;
  }
}

function KanbanProvider({ children, username, onLogout }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);

  async function fetchTasks() {
    const token = localStorage.getItem("token");
    if (!token) {
      onLogout();
      return;
    }

    const res = await fetch(`${API_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      onLogout();
      return;
    }

    const data = await res.json();
    const grouped = { todo: [], inProgress: [], done: [] };

    data.forEach((task) => {
      grouped[task.status].push({ id: task._id, text: task.text });
    });

    dispatch({ type: "LOAD_TASKS", payload: grouped });
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      fetchTasks,
      username,
      onLogout,
    }),
    [state]
  );

  return (
    <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
  );
}

function TaskInput() {
  const { dispatch, fetchTasks, onLogout } = useContext(KanbanContext);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      setError("Task cannot be empty.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in again.");
      onLogout();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(`Failed: ${msg}`);
        return;
      }

      const taskId = await res.text();
      const task = { id: taskId, text };

      dispatch({ type: "ADD_TASK", payload: { task } });
      setText("");
      setError("");

      fetchTasks();
    } catch (err) {
      setError("An error occurred.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input
        type="text"
        className="task-input"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError("");
        }}
        placeholder="Add a task"
      />
      <button type="submit" className="add-btn">
        Add
      </button>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </form>
  );
}

function Column({ title, columnKey }) {
  const { state, dispatch } = useContext(KanbanContext);

  const handleDrop = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("card"));
    if (data.from === columnKey) return;

    dispatch({ type: "MOVE_TASK", payload: { card: data.card, from: data.from, to: columnKey } });

    // optionally update on server here
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragStart = (e, card) => {
    e.dataTransfer.setData(
      "card",
      JSON.stringify({ card, from: columnKey })
    );
  };

  return (
    <div className="column" onDrop={handleDrop} onDragOver={handleDragOver}>
      <h2>{title}</h2>
      {state[columnKey].map((card) => (
        <div
          key={card.id}
          className="card"
          draggable
          onDragStart={(e) => handleDragStart(e, card)}
        >
          {card.text}
        </div>
      ))}
    </div>
  );
}

function TrashDropZone() {
  const { dispatch } = useContext(KanbanContext);

  const handleDrop = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("card"));
    dispatch({ type: "DELETE_TASK", payload: { cardId: data.card.id, from: data.from } });

    // optionally also delete from server here
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="trash-drop-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      🗑️ Drop here to delete
    </div>
  );
}

function KanbanBoard() {
  const { username, onLogout } = useContext(KanbanContext);

  return (
    <div className="board-container">
      <div className="header">
        <span>
          Logged in as: <strong>{username}</strong>
        </span>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <TaskInput />

      <div className="board">
        <Column title="📝 To-Do" columnKey="todo" />
        <Column title="⏳ In Progress" columnKey="inProgress" />
        <Column title="✅ Done" columnKey="done" />
      </div>

      <TrashDropZone />
    </div>
  );
}

function KanbanBoardWrapper({ username, onLogout }) {
  return (
    <KanbanProvider username={username} onLogout={onLogout}>
      <KanbanBoard />
    </KanbanProvider>
  );
}

export default KanbanBoardWrapper;
