import React, { useEffect, useState } from "react";
import Auth from "../../utils/auth"
import Dashboard from "@/pages/dashboard";
import Landing from "./Landing";

function Home() {
  // Decided only after mount (not during the static-export prerender or
  // the first client render) -- Auth.loggedIn() reads localStorage, which
  // differs between the prerendered HTML and the real client, and picking
  // a branch before hydration settles causes a React hydration-mismatch
  // warning/flicker. `null` means "not decided yet".
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    setLoggedIn(Auth.loggedIn());
  }, []);

  if (loggedIn === null) return null;

  return loggedIn ? <Dashboard /> : <Landing />;
}

export default Home;
