import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import Toast from "react-native-toast-message";
import { useAuth } from "./AuthContext";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

export interface AnalysisUpdatePayload {
  analysisId: string;
  status: "pending" | "in_progress" | "completed" | "reviewed" | "delivered";
  prediction?: "Positive" | "Negative";
  risk_score?: number;
  risk_level?: string;
}

interface SocketContextProps {
  isConnected: boolean;
  lastAnalysisUpdate: AnalysisUpdatePayload | null;
}

const SocketContext = createContext<SocketContextProps>({
  isConnected: false,
  lastAnalysisUpdate: null,
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastAnalysisUpdate, setLastAnalysisUpdate] =
    useState<AnalysisUpdatePayload | null>(null);

  useEffect(() => {
    if (!user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      autoConnect: false,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Authenticate so the server maps this socket to the user
      socket.emit("authenticate", user.id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] connection error:", err.message);
    });

    // Analysis result ready — show a toast and expose via context
    socket.on("analysisUpdate", (data: AnalysisUpdatePayload) => {
      setLastAnalysisUpdate(data);

      if (data.status === "completed" && data.prediction) {
        const isPositive = data.prediction === "Positive";
        Toast.show({
          type: isPositive ? "error" : "success",
          text1: "Analysis Complete",
          text2: `${data.prediction}${data.risk_level ? ` — ${data.risk_level}` : ""}`,
          visibilityTime: 5000,
        });
      }
    });

    // Generic notification from backend
    socket.on(
      "newNotification",
      ({ title, message }: { title: string; message: string }) => {
        Toast.show({
          type: "info",
          text1: title || "Notification",
          text2: message,
          visibilityTime: 4000,
        });
      }
    );

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ isConnected, lastAnalysisUpdate }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
