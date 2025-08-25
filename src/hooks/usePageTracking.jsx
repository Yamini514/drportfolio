// src/hooks/usePageTracking.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag("config", "G-B6GK2HFEKT", {
        page_path: location.pathname,
      });
    }
  }, [location]);
};

export default usePageTracking;
