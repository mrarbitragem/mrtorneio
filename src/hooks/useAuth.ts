import { useContext } from "react";
import { AuthContext } from "@/hooks/auth-context";

export const useAuth = () => useContext(AuthContext);
