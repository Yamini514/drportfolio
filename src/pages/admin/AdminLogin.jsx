import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const AdminLogin = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Session expiration time (30 minutes in milliseconds)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  useEffect(() => {
    // Check for saved email and remember me preference
    const savedEmail = localStorage.getItem("adminEmail");
    const savedRememberMe = localStorage.getItem("adminRememberMe") === "true";
    const sessionStart = localStorage.getItem("adminSessionStart");
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
    const manualLogout = localStorage.getItem("manualLogout") === "true";
    if (savedEmail && savedRememberMe) {
      setCredentials((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }

    // Only check session validity if the user is logged in
    if (isLoggedIn && sessionStart && !manualLogout) {
      const sessionTime = parseInt(sessionStart, 10);
      if (!isNaN(sessionTime)) {
        const currentTime = new Date().getTime();
        if (currentTime - sessionTime > SESSION_TIMEOUT) {
          // Session expired, clear localStorage and sign out
          signOut(auth).catch(console.error);
          localStorage.removeItem("adminToken");
          localStorage.removeItem("isAdminLoggedIn");
          localStorage.removeItem("adminSessionStart");
          setError("Session has expired. Please log in again.");
        }
      } else {
        // Invalid sessionStart, clear it
        localStorage.removeItem("adminSessionStart");
      }
    } else if (sessionStart && (!isLoggedIn || manualLogout)) {
      // Clear stale session data if user is not logged in or manually logged out
      localStorage.removeItem("adminSessionStart");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("isAdminLoggedIn");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate input
      if (!credentials.email || !credentials.password) {
        throw new Error("Email and password are required.");
      }

      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      const user = userCredential.user;

      // Check if user is an admin in Firestore
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        if (adminData.role !== "admin") {
          throw new Error("Invalid admin role.");
        }
      } else {
        // Check if user is registered as a regular user
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          throw new Error("Please use the user login page.");
        }

        // If not in users or admins, create admin entry (for first-time admin login)
        await setDoc(doc(db, "admins", user.uid), {
          email: credentials.email,
          role: "admin",
          createdAt: new Date().toISOString(),
        });
      }

      // Handle remember me functionality (store only email)
      if (rememberMe) {
        localStorage.setItem("adminEmail", credentials.email);
        localStorage.setItem("adminRememberMe", "true");
      } else {
        localStorage.removeItem("adminEmail");
        localStorage.removeItem("adminRememberMe");
      }

      // Store session data
      localStorage.setItem("adminToken", await user.getIdToken());
      localStorage.setItem("isAdminLoggedIn", "true");
      localStorage.setItem("adminSessionStart", new Date().getTime().toString());
      localStorage.removeItem("manualLogout"); // Clear manual logout flag

      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error.message);
      await signOut(auth).catch(console.error);
      localStorage.removeItem("adminToken");
      localStorage.removeItem("isAdminLoggedIn");
      localStorage.removeItem("adminSessionStart");

      switch (error.message) {
        case "Email and password are required.":
          setError("Please enter both email and password.");
          break;
        case "Please use the user login page.":
          setError("Please use the user login page.");
          break;
        case "Invalid admin role.":
          setError("Invalid admin role. Please contact support.");
          break;
        default:
          if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/user-not-found" ||
            error.code === "auth/wrong-password"
          ) {
            setError("Invalid email or password. Please try again.");
          } else if (error.code === "auth/too-many-requests") {
            setError("Too many login attempts. Please try again later.");
          } else {
            setError("Login failed. Please try again.");
          }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: currentTheme.background }}
    >
      <div
        className="max-w-md w-full space-y-8 p-8 rounded-xl"
        style={{
          backgroundColor: currentTheme.surface,
          boxShadow: `0 4px 6px -1px ${currentTheme.shadow || "rgba(0, 0, 0, 0.1)"}, 0 2px 4px -1px ${currentTheme.shadow || "rgba(0, 0, 0, 0.06)"}`,
        }}
      >
        <div className="text-center">
          <h2
            className="text-3xl font-bold"
            style={{ color: currentTheme.text.primary }}
          >
            Admin Login
          </h2>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <CustomInput
              type="email"
              name="email"
              placeholder="Email address"
              value={credentials.email}
              onChange={(e) =>
                setCredentials({ ...credentials, email: e.target.value })
              }
              required
              autocomplete="off" // Added to disable suggestions
            />
            <div className="relative">
              <CustomInput
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: currentTheme.text.primary }}
              >
                {showPassword ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm"
                  style={{ color: currentTheme.text.primary }}
                >
                  Remember me
                </label>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
          </div>
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Forgot Password?
            </Link>
          </div>

          <CustomButton
            type="submit"
            loading={loading}
            className="w-full py-2 justify-center"
          >
            {loading ? "Signing in..." : "Sign in"}
          </CustomButton>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;