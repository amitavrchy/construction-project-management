"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { api, ApiError } from "../lib/api";
import { User, Project, Snapshot } from "../lib/types";
type Context = {
  user: User | null;
  projects: Project[];
  snapshot: Snapshot | null;
  projectId: string;
  loading: boolean;
  error: string;
  setProjectId: (id: string) => void;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string) => void;
  mutate: (path: string, data: unknown, method?: string) => Promise<any>;
};
const WorkspaceContext = createContext<Context>(null!);
export const useWorkspace = () => useContext(WorkspaceContext);
export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [projectId, select] = useState(""),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const generation = useRef(0);
  const loadProjects = useCallback(async () => {
    const list = await api<Project[]>("projects");
    setProjects(list);
    return list;
  }, []);
  useEffect(() => {
    api<User>("auth/me")
      .then(async (me) => {
        setUser(me);
        const list = await loadProjects();
        select(
          list.find(
            (p) => p.id === localStorage.getItem(`sitecraft-project:${me.id}`),
          )?.id ||
            list[0]?.id ||
            "",
        );
      })
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [loadProjects]);
  const refresh = useCallback(async () => {
    const list = await loadProjects();
    if (!projectId && list[0]) select(list[0].id);
    if (projectId) {
      const token = ++generation.current;
      const data = await api<Snapshot>(`projects/${projectId}`);
      if (token === generation.current) setSnapshot(data);
    }
  }, [loadProjects, projectId]);
  useEffect(() => {
    if (!user || !projectId) return;
    const token = ++generation.current;
    setSnapshot(null);
    setError("");
    api<Snapshot>(`projects/${projectId}`)
      .then((data) => {
        if (token === generation.current) setSnapshot(data);
      })
      .catch((e) => {
        if (token === generation.current) setError(e.message);
      });
  }, [projectId, user]);
  // Revalidate private in-memory records after returning to the tab. Never persist snapshots.
  useEffect(() => {
    if (!user) return;
    const revalidate = () => {
      void refresh().catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          generation.current++;
          setUser(null);
          setProjects([]);
          setSnapshot(null);
          select("");
        } else setError(e.message);
      });
    };
    window.addEventListener("focus", revalidate);
    return () => window.removeEventListener("focus", revalidate);
  }, [user, refresh]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function login(email: string, password: string) {
    const me = await api<User>("auth/login", "POST", { email, password });
    setUser(me);
    const list = await loadProjects();
    select(
      list.find(
        (p) => p.id === localStorage.getItem(`sitecraft-project:${me.id}`),
      )?.id ||
        list[0]?.id ||
        "",
    );
  }
  async function logout() {
    await api("auth/logout", "POST");
    generation.current++;
    setUser(null);
    setSnapshot(null);
    setProjects([]);
    select("");
  }
  async function mutate(path: string, data: unknown, method = "POST") {
    const result = await api(path, method, data);
    if (path === "auth/password") {
      generation.current++;
      setUser(null);
      setProjects([]);
      setSnapshot(null);
      select("");
      setToast("Password changed. Sign in again on each device.");
      return result;
    }
    try {
      await refresh();
      setError("");
    } catch {
      setError(
        "Changes were saved, but the latest records could not be loaded. Refresh before making another change.",
      );
    }
    setToast("Changes saved successfully");
    return result;
  }
  return (
    <WorkspaceContext.Provider
      value={{
        user,
        projects,
        snapshot,
        projectId,
        loading,
        error,
        setProjectId: (id: string) => {
          select(id);
          if (user) localStorage.setItem(`sitecraft-project:${user.id}`, id);
        },
        refresh,
        login,
        logout,
        notify: setToast,
        mutate,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">✓</span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}
